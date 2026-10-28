import { EMBED_QUERY, FEEDBACK_PATH, LEGAL_URLS } from "@kinwoo/core/app";

import { siteOrigin } from "./site";

const LEGAL_ORIGIN = siteOrigin().replace(/\/+$/, "");

export const TERMS_URL = LEGAL_URLS.terms;
export const PRIVACY_URL = LEGAL_URLS.privacy;
export const FEEDBACK_URL = `${LEGAL_ORIGIN}${FEEDBACK_PATH}?${EMBED_QUERY}`;
