// Deletes every generated catalog document (ids starting with "gen-"), leaving the hand-made demo content.
import {getCliClient} from 'sanity/cli'
const client = getCliClient({apiVersion: '2025-02-19', useCdn: false})
client
  .delete({query: '*[_id match "gen-*" || _id match "drafts.gen-*"]'})
  .then((r) => console.log(`Deleted generated catalog (transaction ${r.transactionId})`))
