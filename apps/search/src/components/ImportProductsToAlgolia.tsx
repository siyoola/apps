import { Box, Button, Text } from "@saleor/macaw-ui/next";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlgoliaSearchProvider } from "../lib/algolia/algoliaSearchProvider";
import { useConfiguration } from "../lib/configuration";
import { Products, useQueryAllProducts } from "./useQueryAllProducts";

const BATCH_SIZE = 100;

export const ImportProductsToAlgolia = () => {
  const [algoliaConfigured, setAlgoliaConfigured] = useState<null | boolean>(null);
  const [started, setStarted] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [isAlgoliaImporting, setIsAlgoliaImporting] = useState(false);

  const products = useQueryAllProducts(!started);

  const algoliaConfiguration = useConfiguration();

  const searchProvider = useMemo(() => {
    if (!algoliaConfiguration.data?.appId || !algoliaConfiguration.data.secretKey) {
      return null;
    }
    return new AlgoliaSearchProvider({
      appId: algoliaConfiguration.data.appId,
      apiKey: algoliaConfiguration.data.secretKey,
      indexNamePrefix: algoliaConfiguration.data.indexNamePrefix,
    });
  }, [
    algoliaConfiguration?.data?.appId,
    algoliaConfiguration?.data?.indexNamePrefix,
    algoliaConfiguration?.data?.secretKey,
  ]);

  const importProducts = useCallback(() => {
    setStarted(true);
  }, []);

  useEffect(() => {
    if (searchProvider) {
      searchProvider
        .ping()
        .then(() => setAlgoliaConfigured(true))
        .catch(() => setAlgoliaConfigured(false));
    }
  }, [searchProvider]);

  useEffect(() => {
    if (!searchProvider || isAlgoliaImporting || products.length <= currentProductIndex) {
      return;
    }
    (async () => {
      setIsAlgoliaImporting(true);
      const productsBatchStartIndex = currentProductIndex;
      const productsBatchEndIndex = Math.min(currentProductIndex + BATCH_SIZE, products.length);
      const productsBatch = products.slice(productsBatchStartIndex, productsBatchEndIndex);

      await searchProvider.updatedBatchProducts(productsBatch);

      setIsAlgoliaImporting(false);
      setCurrentProductIndex(productsBatchEndIndex);
    })();
  }, [searchProvider, currentProductIndex, isAlgoliaImporting, products]);

  return (
    <Box __cursor={started ? "wait" : "auto"}>
      {searchProvider && algoliaConfigured ? (
        <Box>
          <Text variant={"heading"} as={"p"} marginBottom={1.5}>
            Importing products & variants
          </Text>
          <Text as={"p"}>
            Trigger initial indexing for products catalogue. It can take few minutes.{" "}
          </Text>
          <Text marginBottom={5} variant={"bodyStrong"}>
            Do not close the app - its running client-side
          </Text>
          <Box display={"flex"} justifyContent={"flex-end"}>
            <Button disabled={started || !searchProvider} onClick={importProducts}>
              Start importing
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          <Text variant={"heading"} as={"p"} color={"textCriticalDefault"} marginBottom={1.5}>
            App not configured
          </Text>
          <Text>Configure Algolia first</Text>
        </Box>
      )}

      {started && (
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {countVariants(products, currentProductIndex)} /{" "}
          {countVariants(products, products.length)}
          <progress
            value={currentProductIndex}
            max={products.length}
            style={{
              height: "30px",
              width: "500px",
              maxWidth: "100%",
            }}
          />
        </div>
      )}
    </Box>
  );
};

const countVariants = (products: Products, index: number) =>
  products.slice(0, index).reduce((acc, p) => acc + (p.variants?.length ?? 0), 0);
