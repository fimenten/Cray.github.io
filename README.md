https://fimenten.github.io/Cray.github.io/

## Features

- Upload and download trays to a remote server.
- Optional end-to-end encryption for transfers. When uploading or downloading,
  you can specify a password. If a password is supplied the payload will be
  encrypted using AES-GCM before being sent. Unencrypted transfers are still
  supported for backwards compatibility.
- Each tray can now store an encryption key. Use the context menu to set the key
  so uploads and downloads won't prompt for a password every time.
