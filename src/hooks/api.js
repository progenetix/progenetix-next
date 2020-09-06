import swr from "swr"
import { svgFetcher } from "./fetcher"

import { keyBy } from "lodash"

// eslint-disable-next-line no-undef
export const basePath = process.env.NEXT_PUBLIC_API_PATH
// eslint-disable-next-line no-undef
export const useProxy = process.env.NEXT_PUBLIC_USE_PROXY === "true"

export function useExtendedSWR(...args) {
  const { data, error, ...other } = swr(...args)
  return { data, error, ...other, isLoading: !data && !error }
}

export const PROGENETIX = "https://progenetix.org"

export async function tryFetch(url, fallBack = "N/A") {
  console.info(`Fetching data from ${url}.`)
  try {
    const response = await fetch(url)
    return await response.json()
  } catch (e) {
    console.error(`Count not fetch ${url}`)
    if (fallBack) {
      console.info(`Using ${JSON.stringify(fallBack)} as fallBack`)
      return fallBack
    } else {
      throw e
    }
  }
}

// This function gets called at build time on server-side.
export async function getStaticDatatasets() {
  const url = `${PROGENETIX}/cgi/bycon/bin/byconplus.py/get-datasetids/`
  const data = await tryFetch(url, null)
  return data.datasets.map((value) => ({
    value: value.id,
    label: value.name
  }))
}

/**
 * When param is null no query will be triggered.
 */
export function useBeaconQuery(queryData) {
  return useExtendedSWR(
    queryData
      ? `${basePath}cgi/bycon/bin/byconplus.py?${buildQueryParameters(
          queryData
        )}`
      : null
  )
}

export function validateBeaconQuery(queryData) {
  try {
    buildQueryParameters(queryData)
    return null
  } catch (e) {
    return e
  }
}

export function buildQueryParameters(queryData) {
  const {
    start,
    end,
    bioontology,
    materialtype,
    freeFilters,
    ...otherParams
  } = queryData

  // positions from the form have to be -1 adjusted (only first value if interval)
  const starts = []
  if (start) {
    const match = INTEGER_RANGE_REGEX.exec(start)
    if (!match) throw new Error("incorrect start range")
    const [, start0, start1] = match
    starts.push(start0 - 1)
    start1 && starts.push(start1)
  }
  const ends = []
  if (end) {
    const match = INTEGER_RANGE_REGEX.exec(end)
    if (!match) throw new Error("incorrect end range")
    const [, end0, end1] = match
    ends.push(end0 > 0 ? end0 - 1 : end0)
    end1 && ends.push(end1)
  }
  let parsedFreeFilters = freeFilters?.split(",").map((ff) => ff.trim()) ?? []

  const filters = [
    [bioontology].flat() ?? [],
    materialtype ?? [],
    parsedFreeFilters
  ].flat()

  return new URLSearchParams(
    flattenParams([
      ...Object.entries(otherParams),
      ["start", starts],
      ["end", ends],
      ["filters", filters]
    ]).filter(([, v]) => !!v)
  ).toString()
}

export function useDataVisualization(queryData) {
  return useExtendedSWR(
    queryData
      ? `${basePath}cgi/api_process.cgi?${buildDataVisualizationParameters(
          queryData
        )}`
      : null
  )
}

export function buildDataVisualizationParameters(queryData) {
  // accessid=2833da30-e135-11ea-875b-a1a6d91b59c8&
  // &-chr2plot=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22
  // &-size_plotarea_h_px=100
  // &-size_plotimage_w_px=800
  // &-size_title_left_px=0
  // &-size_clustertree_w_px=50
  // &-randno=10
  // &-markers=&
  // group_by=NCIT
  // &-min_group_no=2

  return new URLSearchParams(
    flattenParams([...Object.entries(queryData)]).filter(([, v]) => !!v)
  ).toString()
}

export function publicationDataUrl(id) {
  return `${basePath}services/publications?filters=${id}&responseFormat=simplelist&filterPrecision=exact&method=all`
}

export function usePublication(id) {
  const { data: rawData, error, ...other } = useExtendedSWR(
    publicationDataUrl(id)
  )
  const data = rawData && rawData.filter((r) => !!r) // when not defined the api returns an array with null elements.
  return { data, error, ...other }
}

export function usePublicationList() {
  const url = `${basePath}services/publications?responseFormat=simplelist&filters=genomes:>0`
  return useExtendedSWR(url)
}

export function sampleUrl(id, datasetIds) {
  return `${basePath}cgi/bycon/bin/byconplus.py?scope=biosamples&id=${id}&datasetIds=${datasetIds}`
}

export function useSample(id, datasetIds) {
  return useExtendedSWR(sampleUrl(id, datasetIds))
}

export function useGeneSpans(querytext) {
  const url =
    querytext &&
    querytext.length > 0 &&
    `${basePath}cgi/bycon/bin/genespans.py?geneId=${querytext}`
  return useExtendedSWR(url, (...args) =>
    fetch(...args)
      .then((res) => res.text())
      .then((t) => {
        // dataEffectResult returned is not JSON
        return JSON.parse(t)
      })
  )
}

export function useCytomapper(querytext) {
  const url =
    querytext &&
    querytext.length > 0 &&
    `${basePath}cgi/bycon/bin/cytomapper.py?cytoBands=${querytext}`
  return useExtendedSWR(url)
}

export function useSubsethistogram({
  datasetIds,
  id,
  filter,
  scope,
  size,
  chr2plot
}) {
  const params = [
    ["datasetIds", datasetIds],
    ["id", id],
    ["-size_plotimage_w_px", size]
  ]
  filter && params.push(["filter", filter])
  scope && params.push(["scope", scope])
  chr2plot && params.push(["chr2plot", chr2plot])
  const searchQuery = new URLSearchParams(params).toString()
  return useExtendedSWR(
    size > 0 && `${basePath}cgi/pgx_subsethistogram.cgi?${searchQuery}`,
    svgFetcher
  )
}

export function useCollationsById({ datasetIds }) {
  const { data: rawData, ...other } = useCollations({
    filters: "",
    method: "counts",
    datasetIds
  })
  const transformData = (rawData) => keyBy(rawData, "id")
  const data = rawData && transformData(rawData)
  return { data, ...other }
}

export function useCollations({ datasetIds, method, filters }) {
  const url = `${basePath}cgi/bycon/bin/collations.py?datasetIds=${datasetIds}&method=${method}&filters=${filters}&responseFormat=simplelist`
  const { data: rawData, ...other } = useExtendedSWR(url)
  const data = Array.isArray(rawData) ? rawData : null
  return { data, ...other }
}

// Transforms [[k1, v1], [k2, [v2, v3]]] into [[k1, v1], [k2, v2], [k3, v3]]
function flattenParams(paramArray) {
  return paramArray.flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value.map((v) => [key, v])
    } else {
      return [[key, value]]
    }
  })
}

export const INTEGER_RANGE_REGEX = /^(\d+)(?:[-,;])?(\d+)?$/

export function replaceWithProxy(
  url,
  useProxyOpt = useProxy,
  basePathOpt = basePath
) {
  if (!useProxyOpt) return url
  return url.toString().replace(new URL(url).origin + "/", basePathOpt)
}

export const HANDOVER_IDS = {
  cnvhistogram: "pgx:handover:cnvhistogram",
  biosamplesdata: "pgx:handover:biosamplesdata",
  progenetixtools: "pgx:handover:progenetixtools",
  variantsdata: "pgx:handover:variantsdata"
}
