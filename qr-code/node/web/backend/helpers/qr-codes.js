import { Shopify } from "@shopify/shopify-api";

import { QRCodesDB } from "../qr-codes-db.js";

const QR_CODE_ADMIN_QUERY = `
  query nodes($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        handle
        title
        images(first: 1) {
          edges {
            node {
              url
            }
          }
        }
      }
      ... on ProductVariant {
        id
      }
      ... on DiscountCodeNode {
        id
        codeDiscount {
          ...on DiscountCodeBasic {
            codes(first: 1) {
              edges {
                node {
                  code
                }
              }
            }
          }
          ...on DiscountCodeBxgy {
            codes(first: 1)  {
              edges {
                node {
                  code
                }
              }
            }
          }
          ...on DiscountCodeFreeShipping {
            codes(first: 1)  {
              edges {
                node {
                  code
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function getQrCodeOr404(req, res, checkDomain = true) {
  try {
    const response = await QRCodesDB.read(req.params.id);
    if (
      response === undefined ||
      (checkDomain &&
        (await getShopUrlFromSession(req, res)) !== response.shopDomain)
    ) {
      res.status(404).send();
    } else {
      return response;
    }
  } catch (error) {
    res.status(500).send(error.message);
  }

  return undefined;
}

export async function getShopUrlFromSession(req, res) {
  const session = await Shopify.Utils.loadCurrentSession(req, res, true);
  return `https://${session.shop}`;
}

/**
 * Expect body to contain
 * {
 *   productId: number,
 *   goToCheckout: boolean,
 *   discountCodeId: number | null
 * }
 */
export async function parseQrCodeBody(req, res) {
  const session = await Shopify.Utils.loadCurrentSession(req, res, true);
  const { Product, DiscountCode } = await import(
    `@shopify/shopify-api/dist/rest-resources/${Shopify.Context.API_VERSION}/index.js`
  );

  const product = await Product.find({ session, id: req.body.productId });

  let discountCode = null;
  if (req.body.discountCodeId) {
    const discount = await DiscountCode.find({
      session,
      id: req.body.discountCodeId,
    });
    discountCode = discount.code;
  }

  return {
    productHandle: product.handle,
    variantId: product.variants[0].id,
    goToCheckout: !!req.body.goToCheckout,
    discountCode,
  };
}

export async function formatQrCodeResponse(req, res, rawCodeData) {
  const ids = [];

  rawCodeData.forEach(({ productId, discountId, variantId }) => {
    ids.push(productId);
    ids.push(variantId);

    if (discountId) {
      ids.push(discountId);
    }
  });

  const session = await Shopify.Utils.loadCurrentSession(req, res, true);
  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);

  const adminData = await client.query({
    data: {
      query: QR_CODE_ADMIN_QUERY,
      variables: { ids },
    },
  });

  const formattedData = rawCodeData.map((qrCode) => {
    const product = adminData.body.data.nodes.find(
      (node) => qrCode.productId == node.id
    );

    const discount = adminData.body.data.nodes.find(
      (node) => qrCode.discountId == node.id
    );

    const formattedQRCode = { ...qrCode, product, discount };

    delete formattedQRCode.productId;
    delete formattedQRCode.discountId;

    return formattedQRCode;
  });

  return formattedData;
}
