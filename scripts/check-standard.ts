// Every lesson that references TEKS 5.3H, showing the standard's current published description.
import {getCliClient} from 'sanity/cli'
const client = getCliClient({apiVersion: '2025-02-19', useCdn: false, perspective: 'published'})
client
  .fetch(`*[_type == "lesson" && references("std-teks-5-3h")]{
    "lesson": title.en,
    "standard": standards[@._ref == "std-teks-5-3h"][0]->description
  }`)
  .then((r) => console.log(JSON.stringify(r, null, 2)))
