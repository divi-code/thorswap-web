import { AssetId, CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { Text } from 'components/Text'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectPortfolioAssetIdsByAccountIdExcludeFeeAsset } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Card } from '../Card/Card'
import { AccountAssetsList } from './AccountAssetsList'

type AccountAssetsProps = {
  assetId: AssetId
  accountId: AccountSpecifier
}

export const AccountAssets = ({ assetId, accountId }: AccountAssetsProps) => {
  const assetIds = useAppSelector(state =>
    selectPortfolioAssetIdsByAccountIdExcludeFeeAsset(state, { accountId }),
  )
  const { chainNamespace } = fromAssetId(assetId)
  if (!(chainNamespace === CHAIN_NAMESPACE.Ethereum) || assetIds.length === 0) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation='assets.assetCards.accountTokens' />
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <AccountAssetsList accountId={accountId} assetIds={assetIds} limit={5} />
      </Card.Body>
    </Card>
  )
}
