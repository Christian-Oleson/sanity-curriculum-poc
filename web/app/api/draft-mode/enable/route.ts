// The Presentation tool calls this with a one-time secret. next-sanity verifies the secret
// against the dataset (using the read token) and then turns on Next.js draft mode.
import {defineEnableDraftMode} from 'next-sanity/draft-mode'
import {sanity} from '@/lib/sanity'

export const {GET} = defineEnableDraftMode({
  client: sanity.withConfig({token: process.env.SANITY_API_READ_TOKEN}),
})
