export function getFiles(prefix: string): Promise<FileEntry[]> {
  return new Promise((resolve, reject) => {
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs) => {
      fs.root.createReader().readEntries((entries: Entry[]) => {
        resolve(entries.filter(e => e.isFile && e.name.includes(prefix)))
      }, reject)
    }, reject)
  })
}

export function getLocalFileOrDowload(remoteFileUri: string, fileName: string, prefix: string): Promise<FileEntry> {
  return new Promise((resolve, reject) => {
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs) => {
      fs.root.getFile(prefix + fileName, null, (fe) => {
        resolve(fe)
      }, (err: FileError) => {
        if (err.code === FileError.NOT_FOUND_ERR) {
          syncRemoteFile(fs, remoteFileUri, fileName, prefix)
          .then(resolve)
          .catch(reject)
        } else {
          reject(err)
        }
      })
    }, reject)
  })
}

export function isFileTransfertError(error: FileError | FileTransferError): error is FileTransferError {
  return (error as FileTransferError).source !== undefined
}

function syncRemoteFile(fs: FileSystem, remoteFileUri: string, fileName: string, prefix: string): Promise<FileEntry> {
  return new Promise((resolve, reject) => {
    fs.root.getFile(
      prefix + fileName,
      { create: true, exclusive: false },
      (fileEntry) =>
        download(fileEntry, remoteFileUri)
        .then(resolve)
        .catch(err => {
          // a zero lenght file is created while trying to download and save
          fileEntry.remove(() => {})
          reject(err)
        }),
      reject
    )
  })
}

function download(fileEntry: FileEntry, uri: string): Promise<FileEntry> {
  return new Promise((resolve, reject) => {
    const fileTransfer = new FileTransfer()
    const fileURL = fileEntry.toURL()
    fileTransfer.download(uri, fileURL, resolve, reject)
  })
}
