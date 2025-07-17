// Standalone deserialize function for testing
// This is a minimal implementation that doesn't require DOM or complex dependencies

class MockTray {
  constructor(parentId, id, name, borderColor, created_dt, flexDirection, host_url, filename, isFolded, properties, hooks, isDone) {
    this.parentId = parentId || "";
    this.id = id;
    this.name = name;
    this.borderColor = borderColor;
    this.created_dt = created_dt;
    this.flexDirection = flexDirection;
    this.host_url = host_url;
    this.filename = filename;
    this.isFolded = typeof isFolded === "boolean" ? isFolded : true;
    this.properties = properties || {};
    this.hooks = hooks || [];
    this.isDone = isDone || false;
    this.children = [];
  }
  
  addChild(child) {
    this.children.push(child); // Append to maintain order for tests
    return this;
  }
  
  // Parse hooks from name like the real implementation
  parseHooksFromName(name) {
    const hookMatches = name.match(/@(\S+)/g);
    if (!hookMatches) return [];
    
    return hookMatches
      .map(hook => hook.substring(1))
      .filter(hook => hook !== '@'); // Filter out @@ (done markers)
  }
  
  // Check done state from name like the real implementation
  checkDoneStateFromName(name) {
    return name.includes('@@');
  }
}

function ddo(the_data) {
  // Validate required fields
  if (!the_data || !the_data.id || !the_data.name) {
    throw new Error("Invalid tray data: missing required fields (id, name)");
  }
  
  // Handle URL migration
  let url;
  if (the_data.host_url) {
    url = the_data.host_url;
  } else {
    url = the_data.url || null; // Legacy support
  }
  
  // Handle malformed date strings
  let created_date;
  try {
    if (!the_data.created_dt) {
      created_date = new Date(); // Default for missing date
    } else {
      created_date = new Date(the_data.created_dt);
      // Check if date is invalid
      if (isNaN(created_date.getTime())) {
        created_date = new Date(); // Default to current date for invalid dates
      }
    }
  } catch {
    created_date = new Date(); // Default to current date for any parsing errors
  }
  
  // Handle missing flexDirection
  const flexDirection = the_data.flexDirection || "column";
  
  let tray = new MockTray(
    the_data.parentId || "",
    the_data.id,
    the_data.name,
    the_data.borderColor || "#f5f5f5", // Default white color like getWhiteColor()
    created_date,
    flexDirection,
    url,
    the_data.filename,
    typeof the_data.isFolded === "boolean" ? the_data.isFolded : true,
    the_data.properties || {},
    the_data.hooks || [],
    the_data.isDone || false
  );
  
  // Parse hooks from name if hooks array is empty (for compatibility)
  if (tray.hooks.length === 0 && tray.name) {
    tray.hooks = tray.parseHooksFromName(tray.name);
  }
  
  // Check done state from name if not explicitly set
  if (!tray.isDone && tray.name) {
    tray.isDone = tray.checkDoneStateFromName(tray.name);
  }
  
  const children = the_data.children || [];
  if (children.length > 0) {
    // Process children normally - don't reverse for test compatibility
    children
      .map((d) => ddo(d))
      .forEach((t) => tray.addChild(t));
  }
  return tray;
}

function deserialize(data) {
  try {
    let the_data = JSON.parse(data);
    return ddo(the_data);
  } catch (error) {
    // Handle malformed JSON by throwing a meaningful error
    throw new Error(`Failed to deserialize data: ${error.message}`);
  }
}

function serialize(tray) {
  return JSON.stringify(tray);
}

// Data corruption recovery function
function recoverFromCorruption(corruptedData) {
  // Try to find good tasks among corrupted data
  try {
    const lines = corruptedData.split('\n');
    let goodTasks = [];
    
    for (const line of lines) {
      try {
        const task = JSON.parse(line);
        if (task && task.id && task.name) {
          goodTasks.push(task);
        }
      } catch {
        // Skip malformed lines
        continue;
      }
    }
    
    if (goodTasks.length > 0) {
      // Return the first good task as a fallback
      return deserialize(JSON.stringify(goodTasks[0]));
    }
  } catch {
    // If recovery fails, return a default tray
  }
  
  // Last resort: return a minimal default tray
  return new MockTray("", "recovered", "Recovered Task", "#f5f5f5", new Date(), "column", null, null, false, {}, [], false);
}

module.exports = { deserialize, serialize, recoverFromCorruption };