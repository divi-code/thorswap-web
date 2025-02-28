import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  isCosmosAssetId,
  isOsmosisAssetId,
} from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import qs from 'qs'
import { useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectMarketDataById,
  selectSelectedLocale,
  selectTotalBondingsBalanceByAssetId,
  selectValidatorByAddress,
} from 'state/slices/selectors'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from 'state/slices/validatorDataSlice/constants'
import { useAppSelector } from 'state/store'

import { CosmosEmpty } from './CosmosEmpty'
import { WithdrawCard } from './WithdrawCard'

export const CosmosOverview = () => {
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query

  const assetNamespace = 'slip44'
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const opportunities = useCosmosSdkStakingBalances({ assetId: stakingAssetId })

  const opportunity = useMemo(
    () =>
      opportunities?.cosmosSdkStakingOpportunities?.find(
        opportunity => opportunity.address === contractAddress,
      ),
    [opportunities, contractAddress],
  )

  const loaded = useMemo(() => opportunity?.isLoaded, [opportunity?.isLoaded])

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, stakingAsset?.chainId),
  )

  const totalBondings = useAppSelector(state =>
    selectTotalBondingsBalanceByAssetId(state, {
      accountSpecifier,
      validatorAddress: contractAddress,
      assetId: stakingAsset.assetId,
    }),
  )

  const marketData = useAppSelector(state => selectMarketDataById(state, stakingAssetId))
  const cryptoAmountAvailable = bnOrZero(totalBondings).div(`1e${stakingAsset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: stakingAssetId, selectedLocale })

  const defaultValidatorAddress = useMemo(() => {
    if (isCosmosAssetId(stakingAssetId)) return SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS
    if (isOsmosisAssetId(stakingAssetId)) return SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS

    return ''
  }, [stakingAssetId])
  const validatorData = useAppSelector(state =>
    selectValidatorByAddress(state, defaultValidatorAddress),
  )

  const apr = useMemo(() => bnOrZero(validatorData?.apr).toString(), [validatorData])

  if (!opportunity) return null

  const hasClaim = bnOrZero(opportunity?.rewards).gt(0)
  const claimDisabled = !hasClaim

  if (!loaded || !opportunity) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  if (bnOrZero(totalBondings).eq(0)) {
    return (
      <CosmosEmpty
        assets={[stakingAsset]}
        apy={apr ?? ''}
        onStakeClick={() =>
          history.push({
            pathname: location.pathname,
            search: qs.stringify({
              ...query,
              modal: DefiAction.Deposit,
            }),
          })
        }
        onLearnMoreClick={() =>
          history.push({
            pathname: location.pathname,
            search: qs.stringify({
              ...query,
              modal: DefiAction.GetStarted,
            }),
          })
        }
      />
    )
  }

  return (
    <Overview
      asset={stakingAsset}
      name={opportunity.moniker}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssets={[
        {
          ...stakingAsset,
          cryptoBalance: cryptoAmountAvailable.toFixed(stakingAsset.precision),
          allocationPercentage: '1',
        },
      ]}
      provider={`${stakingAsset.name} Staking`}
      menu={[
        {
          label: 'common.deposit',
          icon: <ArrowUpIcon />,
          action: DefiAction.Deposit,
        },
        {
          label: 'common.withdraw',
          icon: <ArrowDownIcon />,
          action: DefiAction.Withdraw,
        },
        {
          label: 'common.claim',
          icon: <FaGift />,
          action: DefiAction.Claim,
          variant: 'ghost-filled',
          colorScheme: 'green',
          isDisabled: claimDisabled,
          toolTip: translate('defi.modals.overview.noWithdrawals'),
        },
      ]}
      description={{
        description: stakingAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: stakingAsset.isTrustedDescription,
      }}
      tvl={bnOrZero(opportunity.tvl).toFixed(2)}
      apy={apr?.toString()}
    >
      <WithdrawCard asset={stakingAsset} />
    </Overview>
  )
}
