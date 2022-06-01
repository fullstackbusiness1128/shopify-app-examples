import { useEffect, useState } from 'react'
import { useNavigate, TitleBar, Loading } from '@shopify/app-bridge-react'
import { Card, EmptyState, Layout, Page, SkeletonBodyText } from '@shopify/polaris'
import { useAuthenticatedFetch } from '../hooks'
import { CodeIndex } from '../components'

export default function HomePage() {
  const navigate = useNavigate()
  const fetch = useAuthenticatedFetch()
  const [{ loading, qrCodes }, setData] = useState({
    loading: true,
    qrCodes: [],
  })

  useEffect(async () => {
    const qrCodes = await fetch('/api/qrcodes').then((res) => res.json())
    setData({ loading: false, qrCodes })
  }, [])

  const loadingMarkup = loading ? (
    <Card sectioned>
      <Loading />
      <SkeletonBodyText />
    </Card>
  ) : null

  const qrCodesMarkup =
    qrCodes.length && !loading ? <CodeIndex qrCodes={qrCodes} /> : null

  const emptyStateMarkup =
    !loading && !qrCodes.length ? (
      <Card sectioned>
        <EmptyState
          heading="Create unique QR codes for your product"
          action={{
            content: 'Create QR code',
            onAction: () => navigate('/codes'),
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            Allow customers to scan codes and buy products using their phones.
          </p>
        </EmptyState>
      </Card>
    ) : null

  return (
    <Page>
      <TitleBar
        primaryAction={{
          content: 'Create QR code',
          onAction: () => navigate('/codes'),
        }}
      />
      <Layout>
        <Layout.Section>
          {loadingMarkup}
          {qrCodesMarkup}
          {emptyStateMarkup}
        </Layout.Section>
      </Layout>
    </Page>
  )
}
