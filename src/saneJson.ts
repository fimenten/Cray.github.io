import { Tray } from "./tray";

// Define interfaces for serialized data
interface TrayData {
    id: string;
    name: string;
    labels: string[];
    parentId: string | null;
    borderColor: string;
    created_dt: string; // ISO string format
    flexDirection: "column" | "row";
    host_url: string | null;
    filename: string | null;
    isFolded: boolean;
    isEditing: boolean;
}

interface Edge {
    childId: string;
    parentId: string | null;
}

interface SerializedData {
    trayDataList: TrayData[];
    edgeList: Edge[];
}

// Serialization function
function serializeTray(root: Tray): SerializedData {
    const trayDataList: TrayData[] = [];
    const edgeList: Edge[] = [];

    function traverse(tray: Tray) {
        // Extract serializable properties
        const trayData: TrayData = {
            id: tray.id,
            name: tray.name,
            labels: tray.labels,
            parentId: tray.parentId,
            borderColor: tray.borderColor,
            created_dt: tray.created_dt.toISOString(),
            flexDirection: tray.flexDirection,
            host_url: tray.host_url,
            filename: tray.filename,
            isFolded: tray.isFolded,
            isEditing: tray.isEditing,
        };

        trayDataList.push(trayData);

        // Create edge if there is a parent
        if (tray.parentId) {
            edgeList.push({
                childId: tray.id,
                parentId: tray.parentId,
            });
        }

        // Recursively traverse children
        for (const child of tray.children) {
            traverse(child);
        }
    }

    traverse(root);

    return { trayDataList, edgeList };
}

