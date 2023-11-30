import { HistoryRounded } from '@mui/icons-material';
import { Button } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL as joinUrl } from 'ufo';

import CommitsTip from '../../components/template-form/commits-tip';
import BranchButton from './branch-button';
import SaveButton from './save-button';
import { useProjectState } from './state';

export default function HeaderActions() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const navigate = useNavigate();

  const {
    state: { loading, commits, project },
  } = useProjectState(projectId, gitRef);

  const simpleMode = !project || project?.gitType === 'simple';

  // const { exporter, exportFiles } = useExportFiles({ projectId, gitRef });

  // const pickFile = usePickFile();

  // const onImport = useCallback(
  //   async (path?: string[]) => {
  //     try {
  //       const list = await pickFile({ accept: '.yaml,.yml', multiple: true }).then((files) =>
  //         Promise.all(
  //           files.map((i) =>
  //             readFileAsText(i).then((i) => {
  //               const obj = parse(i);

  //               // 用于兼容比较旧的导出数据
  //               // {
  //               //   templates: {
  //               //     folderId?: string
  //               //   }[]
  //               //   folders: {
  //               //     _id: string
  //               //     name?: string
  //               //   }[]
  //               // }
  //               if (Array.isArray(obj?.templates) && Array.isArray(obj?.folders)) {
  //                 obj.templates.forEach((template: any) => {
  //                   if (template.folderId) {
  //                     const folder = obj.folders.find((f: any) => f._id === template.folderId);
  //                     if (folder.name) {
  //                       template.path = folder.name;
  //                     }
  //                   }
  //                 });
  //               }

  //               return importBodySchema.validateAsync(obj, { stripUnknown: true });
  //             })
  //           )
  //         )
  //       );

  //       const templates = uniqBy(
  //         list.flatMap((i) => i.templates ?? []),
  //         'id'
  //       ).map((i) => ({ ...i, path: i.path?.split('/') }));

  //       const existedTemplateIds = new Set(
  //         Object.values(store.files)
  //           .filter(isTemplate)
  //           .map((i) => i.id)
  //       );

  //       const renderTemplateItem = ({
  //         template,
  //         ...props
  //       }: { template: Template & { path?: string[] } } & BoxProps) => {
  //         return (
  //           <Box {...props}>
  //             <Box sx={{ display: 'flex', alignItems: 'center' }}>
  //               <Box sx={{ flexShrink: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
  //                 <Typography color="text.secondary" component="span">
  //                   {template.path?.length ? `${template.path.join('/')}/` : ''}
  //                 </Typography>

  //                 {template.name || t('alert.unnamed')}
  //               </Box>

  //               {existedTemplateIds.has(template.id) && (
  //                 <Tooltip
  //                   title={
  //                     <>
  //                       <Box component="span">{t('alert.overwrittenTip')}</Box>
  //                       <Box
  //                         component="a"
  //                         sx={{
  //                           ml: 1,
  //                           userSelect: 'none',
  //                           color: 'white',
  //                           textDecoration: 'underline',
  //                           cursor: 'pointer',
  //                           ':hover': { opacity: 0.6 },
  //                         }}
  //                         onClick={() => {
  //                           const path = Object.values(store.tree).find(
  //                             (i) => i?.split('/').slice(-1)[0] === `${template.id}.yaml`
  //                           );
  //                           if (path) {
  //                             exportFiles(path.split('/'), { quiet: true });
  //                           }
  //                         }}>
  //                         {t('alert.downloadBackup')}
  //                       </Box>
  //                     </>
  //                   }>
  //                   <InfoOutlined color="warning" fontSize="small" sx={{ mx: 1 }} />
  //                 </Tooltip>
  //               )}
  //             </Box>
  //           </Box>
  //         );
  //       };

  //       showDialog({
  //         fullWidth: true,
  //         maxWidth: 'sm',
  //         title: t('alert.import'),
  //         content: (
  //           <Box>
  //             <Typography>{t('alert.importTip')}</Typography>
  //             <Box component="ul" sx={{ pl: 2 }}>
  //               {templates.map((template) =>
  //                 renderTemplateItem({
  //                   key: template.id,
  //                   component: 'li',
  //                   template,
  //                 })
  //               )}
  //             </Box>
  //           </Box>
  //         ),
  //         cancelText: t('alert.cancel'),
  //         okText: t('alert.import'),
  //         onOk: async () => {
  //           try {
  //             importFiles({ store, parent: path, files: templates });
  //             // await importTemplates({ projectId, branch: gitRef, path: path?.join('/') || '', templates });

  //             Toast.success(t('alert.imported'));
  //           } catch (error) {
  //             Toast.error(getErrorMessage(error));
  //             throw error;
  //           }
  //         },
  //       });
  //     } catch (error) {
  //       Toast.error(getErrorMessage(error));
  //       throw error;
  //     }
  //   },
  //   [pickFile, store, showDialog, t, exportFiles]
  // );

  return (
    <>
      {!simpleMode && <BranchButton projectId={projectId} gitRef={gitRef} filepath={filepath} />}
      <CommitsTip
        loading={loading}
        commits={commits}
        hash={gitRef}
        onCommitSelect={(commit) => {
          navigate(joinUrl('..', commit.oid), { state: { filepath } });
        }}>
        <Button sx={{ minWidth: 32, minHeight: 32 }}>
          <HistoryRounded />
        </Button>
      </CommitsTip>
      <SaveButton projectId={projectId} gitRef={gitRef} />
    </>
  );
}
