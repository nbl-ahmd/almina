import "server-only";
import { cache } from "react";
import { CatalogUnavailable } from "./catalog-response";
import { getProducts } from "./catalog";
import {
  collectionProducts,
  type HomeCollection,
} from "../catalog/merchandising";
export const getCollectionProducts = cache(
  async (collection: HomeCollection) => {
    const results = await Promise.allSettled(
      collection.queries.map((q) => getProducts({ q, sharedSearch: true })),
    );
    if (
      results.some((result) => result.status === "rejected") &&
      !results.some(
        (result) =>
          result.status === "fulfilled" && result.value.products.length > 0,
      )
    )
      throw new CatalogUnavailable("connection");
    return collectionProducts(
      collection,
      results.flatMap((result) =>
        result.status === "fulfilled" ? result.value.products : [],
      ),
    );
  },
);
