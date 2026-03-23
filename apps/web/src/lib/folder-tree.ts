import type { Folder } from "@promptbase/shared";

export type FolderTreeNode = Folder & {
  children?: FolderTreeNode[];
};

export interface FlattenedFolder extends Folder {
  depth: number;
}

export function flattenFolderTree(folders: FolderTreeNode[] | undefined, depth = 0): FlattenedFolder[] {
  if (!folders?.length) return [];

  return folders.flatMap((folder) => [
    { ...folder, depth },
    ...flattenFolderTree(folder.children, depth + 1),
  ]);
}
