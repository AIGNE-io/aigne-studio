import { useUploader } from '@app/contexts/uploader';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { EditorConfigProvider } from '@blocklet/editor/lib/config';
import { MarkdownEditor } from '@blocklet/editor/lib/main/markdown-editor';
import { joinURL } from 'ufo';

import { useProjectStore } from '../yjs-state';

export default function Readme({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const uploaderRef = useUploader();
  const { t } = useLocaleContext();
  const mediaUrlPrefix = joinURL(
    window.blocklet?.componentMountPoints?.find((x) => x.did === 'z8ia1mAXo8ZE7ytGF36L5uBf9kD2kenhqFGp9')?.mountPoint ??
      ''
  );

  // @ts-ignore
  if (!window.uploaderRef) {
    // @ts-ignore
    window.uploaderRef = uploaderRef;
  }

  const { projectSetting } = useProjectStore(projectId, projectRef);

  const setProjectSetting = (update: (v: typeof projectSetting) => void) => {
    const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
    doc.transact(() => {
      update(projectSetting);
    });
  };

  const config = {
    uploader: {
      upload: async (blobFile: Blob) => {
        const uploader = uploaderRef?.current?.getUploader();
        const { data } = await uploader.uploadFile(blobFile).then((result: any) => {
          return result?.response;
        });

        return { url: data.url };
      },
    },
  };

  return (
    <EditorConfigProvider value={config}>
      <MarkdownEditor
        placeholder={t('projectSetting.readme')}
        editorState={projectSetting.readme}
        mediaUrlPrefix={mediaUrlPrefix}
        onChange={(markdown) => {
          setProjectSetting((config) => {
            config.readme = markdown;
          });
        }}
      />
    </EditorConfigProvider>
  );
}
