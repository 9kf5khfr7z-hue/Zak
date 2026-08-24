# OneSignal Integration Notes

## Verified official contract

- Push endpoint: `POST https://api.onesignal.com/notifications?c=push`.
- Authentication uses the OneSignal App API key in the `Authorization` header with the `Key ` prefix.
- The JSON body must include `app_id` and `contents`; `headings` is supported for the title.
- The App ID is a public UUID identifier and may be used in client-side SDK initialization, while the App API key is private and must remain server-side.
- OneSignal recommends storing App API keys in a secrets manager/backend environment variable, using separate staging and production keys, and optionally applying IP allowlisting.
- The current project adapter must remain dormant until an explicit production flag is enabled and valid secrets are present.

## Source references

1. https://documentation.onesignal.com/reference/push-notification
2. https://documentation.onesignal.com/reference/create-message
3. https://documentation.onesignal.com/docs/en/keys-and-ids

## Project decision

ZAK will use OneSignal for the production push adapter. The integration will be implemented and tested in a non-production configuration first. No real key is stored in this repository, and no production push is enabled by this change.
