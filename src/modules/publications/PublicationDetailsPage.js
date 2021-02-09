import React from "react"
import { usePublication } from "../../hooks/api"
import { Loader, WithData } from "../../components/Loader"
import { withUrlQuery } from "../../hooks/url-query"
import { SubsetHistogram } from "../../components/Histogram"
import { Layout } from "../../components/Layout"
import { epmcUrl, EpmcLink } from "./EpmcUrl"

const PublicationDetailsPage = withUrlQuery(({ urlQuery }) => {
  const { id } = urlQuery
  return (
    <Layout title="Publication Details">
      {!id ? <NoResultsHelp /> : <PublicationLoader id={id} />}
    </Layout>
  )
})
export default PublicationDetailsPage

function NoResultsHelp() {
  return (
    <div className="notification is-size-5">
      This page will only show content if called with a specific Pubmed ID which
      already exists in the Progenetix `publications` database, e.g.{" "}
      <a href={"/publications/details?id=PMID:28966033"}>
        /publication/details?id=PMID:28966033
      </a>
      . Please start over from the Progenetix Publication Collection page.
    </div>
  )
}

function PublicationLoader({ id }) {
  const publicationReply = usePublication(id)
  return (
    <WithData
      apiReply={publicationReply}
      background
      render={(response) => (
        <PublicationResponse results={response.results} id={id} />
      )}
    ></WithData>
  )
}

function PublicationResponse({ results, id }) {
  if (results?.length >= 1) {
    return results.map((publication, i) => (
      <PublicationDetails key={i} publication={publication} id={id} />
    ))
  } else {
    return <NoResultsHelp />
  }
}

function PublicationDetails({ publication, id }) {
  const progenetixBiosamplesCount = publication.counts?.progenetix ?? 0
  const arraymapBiosamplesCount = publication.counts?.arraymap ?? 0
  return (
    <section className="content">
      <h2 className="tile">
        {publication.id}{" "}
        <a rel="noreferrer" target="_blank" href={epmcUrl(publication.id)}>
          {"{EPMC ↗}"}
        </a>
      </h2>
      <h3 className="subtitle is-5">{publication.title}</h3>
      <p className="has-text-weight-semibold">{publication.authors}</p>
      <p>
        <i>{publication.journal}</i> {id} <EpmcLink publicationId={id} />
      </p>
      <p>{publication.abstract}</p>
      <h5>Origin</h5>
      <p>{publication.provenance.geo_location.properties.label}</p>
      <h5>Genome Screens</h5>
      <ul className="mb-5">
        {technologies.map((technologie, i) =>
          publication.counts[technologie] ? (
            <li key={i}>
              {technologie}: {publication.counts[technologie]}
            </li>
          ) : null
        )}
        {progenetixBiosamplesCount > 0 && (
          <li>
            {progenetixBiosamplesCount} sample profiles are registered in
            Progenetix
          </li>
        )}
        {arraymapBiosamplesCount > 0 && (
          <li>
            {arraymapBiosamplesCount} sample profiles are registered in arrayMap
          </li>
        )}
      </ul>
      {(progenetixBiosamplesCount > 0 || arraymapBiosamplesCount > 0) && (
        <a
          className="button is-info mb-5"
          href={sampleSearchHref({
            id,
            progenetixSamplesCount: progenetixBiosamplesCount,
            arraymapSamplesCount: arraymapBiosamplesCount
          })}
        >
          Retrieve Publication Samples
        </a>
      )}

      {progenetixBiosamplesCount > 0 && (
        <div className="mb-5">
          <SubsetHistogram id={id} filter={id} datasetIds="progenetix" />
        </div>
      )}
      {arraymapBiosamplesCount > 0 && (
        <SubsetHistogram id={id} filter={id} datasetIds="arraymap" />
      )}
    </section>
  )
}

function sampleSearchHref({
  id,
  progenetixSamplesCount,
  arraymapSamplesCount
}) {
  const datasetsIds = []
  if (progenetixSamplesCount > 0) datasetsIds.push("progenetix")
  if (arraymapSamplesCount > 0) datasetsIds.push("arraymap")

  return `/biosamples/search?freeFilters=${id}&datasetIds=${datasetsIds.join(
    ","
  )}&filterPrecision=exact&executeSearch=true`
}

const technologies = ["ccgh", "acgh", "wes", "wgs"]
