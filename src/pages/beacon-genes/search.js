import Page from "../../modules/beacon-instances/beacon-genes/BeaconPage"
import { getCytoBands } from "../../utils/genome"
export default Page

// This function gets called at build time on server-side.
export const getStaticProps = async () => ({
  props: {
    cytoBands: await getCytoBands()
  }
})