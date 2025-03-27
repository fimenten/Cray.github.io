// Serialization function
function serializeToSaneJson(root) {
    const trayDataList = [];
    const edgeList = [];
    function traverse(tray) {
        // Extract serializable properties
        const trayData = {
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
export {};
