import * as vscode from "vscode";
import { FullVal, ValtownClient, Blob } from "../client";

export class ValTreeView implements vscode.TreeDataProvider<vscode.TreeItem> {
  constructor(private client: ValtownClient) {}

  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined | null | void
  > = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    vscode.TreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;
  refresh() {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: vscode.TreeItem | undefined) {
    if (!this.client.authenticated) {
      return [];
    }

    let prefix = element ? element.resourceUri?.path.slice(1) : undefined;
    const uid = await this.client.uid();
    const blobs = await this.client.listBlobs(prefix);
    const treeItems: Record<string, vscode.TreeItem> = {};
    for (const blob of blobs) {
      const filepath = blob.key.slice(prefix?.length || 0);
      if (filepath.split("/").length > 1) {
        const folder = filepath.split("/")[0];
        treeItems[folder] = {
          contextValue: "folder",
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
          iconPath: vscode.ThemeIcon.Folder,
          resourceUri: vscode.Uri.parse(`vt+blob://${uid}/${folder}/`),
        };
      } else {
        treeItems[filepath] = {
          id: blob.key,
          contextValue: "blob",
          resourceUri: vscode.Uri.parse(`vt+blob://${uid}/${blob.key}`),
          iconPath: vscode.ThemeIcon.File,
          command: {
            command: "vscode.open",
            title: "Open Blob",
            arguments: [`vt+blob://${uid}/${blob.key}`],
          },
        };
      }
    }

    return Object.values(treeItems);
  }

  getTreeItem(
    element: vscode.TreeItem
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
}

export async function registerBlobTreeView(
  context: vscode.ExtensionContext,
  client: ValtownClient
) {
  const tree = new ValTreeView(client);
  context.subscriptions.push(
    vscode.window.createTreeView("valtown.blobs", {
      treeDataProvider: tree,
      showCollapseAll: true,
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("valtown.blob.refresh", async () => {
      tree.refresh();
    })
  );
}
