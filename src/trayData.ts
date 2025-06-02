export type TrayId = string;
export interface Traydata{
    id: TrayId;
    name: string;
    // children: Tray[];
    childrenIds:TrayId[];
    parentId: TrayId;
    borderColor: string;
    created_dt: Date;
    flexDirection: "column" | "row";
    host_url: string | null;
    filename: string | null;
    isFolded: boolean;
    properties: Record<string, any>;

}
