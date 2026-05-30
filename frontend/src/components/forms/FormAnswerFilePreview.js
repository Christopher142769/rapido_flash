import React from 'react';
import { FaDownload, FaExternalLinkAlt, FaFilePdf, FaImage } from 'react-icons/fa';
import { downloadFormFile, getAnswerFiles, inferFileKind } from '../../utils/formAnswerFiles';

export default function FormAnswerFilePreview({ answer }) {
  const files = getAnswerFiles(answer);
  if (!files.length) return null;

  return (
    <div className="cforms-file-preview-list">
      {files.map((file, i) => {
        const kind = inferFileKind(file);
        const label =
          file.fileName ||
          (kind === 'pdf' ? `Document PDF ${files.length > 1 ? i + 1 : ''}`.trim() : kind === 'image' ? 'Image' : 'Fichier');

        return (
          <div key={`${file.fileUrl}-${i}`} className="cforms-file-preview-item">
            <div className="cforms-file-preview-toolbar">
              <span className="cforms-file-preview-label">
                {kind === 'pdf' ? <FaFilePdf aria-hidden /> : kind === 'image' ? <FaImage aria-hidden /> : null}
                {label}
              </span>
              <div className="cforms-file-preview-actions">
                <a
                  className="cforms-btn ghost sm"
                  href={file.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaExternalLinkAlt aria-hidden />
                  Ouvrir
                </a>
                <button
                  type="button"
                  className="cforms-btn ghost sm"
                  onClick={() => downloadFormFile(file.fileUrl, file.fileName)}
                >
                  <FaDownload aria-hidden />
                  Télécharger
                </button>
              </div>
            </div>
            {kind === 'image' ? (
              <a
                className="cforms-file-preview-media"
                href={file.fileUrl}
                target="_blank"
                rel="noreferrer"
              >
                <img src={file.fileUrl} alt={label} className="cforms-img-preview cforms-img-preview--answer" />
              </a>
            ) : null}
            {kind === 'pdf' ? (
              <iframe title={label} src={file.fileUrl} className="cforms-pdf-preview" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
