/**
 * Graph layout generator for connected commit graph based on
 * "Historia de la Música Visual" layout structure (ui-design.jpg)
 */

export const BRANCH_COLORS = [
  '#c5a059', // Antique Gold / Champagne (Main/Master)
  '#4a6b82', // Oxford Slate Blue (Features)
  '#9e4747', // Heritage Crimson / Burgundy (Fixes)
  '#3d6b56', // British Racing Green (Refactors)
  '#8b7d6b', // Warm Taupe / Sand (Docs)
  '#6c7a89', // Muted Pewter (Chores)
  '#a3783a', // Warm Cognac / Bronze
  '#5e7a68', // Muted Sage
];

/**
 * Assigns vertical lane positions (x-coords) and row positions (y-coords) to commits.
 * Builds connected paths between commits and their parents.
 */
export function buildCommitGraph(commits) {
  if (!commits || commits.length === 0) {
    return { nodes: [], connections: [], laneCount: 0, dateMilestones: [] };
  }

  // Active lanes allocation map: sha -> laneIndex
  const laneMap = new Map();
  const openLanes = []; // array tracking currently active sha for each lane

  const nodes = [];
  const connections = [];
  const dateMilestones = [];

  let lastDateGroup = '';
  const ROW_HEIGHT = 110;
  const LANE_WIDTH = 55;
  const LEFT_TIMELINE_OFFSET = 180;
  const TOP_PADDING = 70;

  commits.forEach((commit, index) => {
    const y = TOP_PADDING + index * ROW_HEIGHT;

    // Check date change for left timeline scale
    let dateStr = '';
    try {
      const d = new Date(commit.date);
      dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      dateStr = commit.date ? commit.date.substring(0, 10) : '';
    }

    if (dateStr !== lastDateGroup) {
      dateMilestones.push({ date: dateStr, y, index });
      lastDateGroup = dateStr;
    }

    // Determine lane index for this commit
    let lane = -1;

    // Check if this commit was expected in an existing open lane
    for (let l = 0; l < openLanes.length; l++) {
      if (openLanes[l] === commit.sha) {
        lane = l;
        openLanes[l] = null; // free up
        break;
      }
    }

    // If not found in open lanes, pick first available lane or open a new one
    if (lane === -1) {
      lane = openLanes.findIndex(l => l === null);
      if (lane === -1) {
        lane = openLanes.length;
        openLanes.push(null);
      }
    }

    laneMap.set(commit.sha, lane);
    const x = LEFT_TIMELINE_OFFSET + lane * LANE_WIDTH;

    // Update open lanes for parents
    if (commit.parents && commit.parents.length > 0) {
      // First parent continues in current lane if open lane is free
      const primaryParent = commit.parents[0];
      if (openLanes[lane] === null) {
        openLanes[lane] = primaryParent;
      }

      // Additional parents (merges) get allocated to other lanes
      for (let p = 1; p < commit.parents.length; p++) {
        const parentSha = commit.parents[p];
        let pLane = openLanes.findIndex(l => l === parentSha);
        if (pLane === -1) {
          pLane = openLanes.findIndex(l => l === null);
          if (pLane === -1) {
            pLane = openLanes.length;
            openLanes.push(null);
          }
          openLanes[pLane] = parentSha;
        }
      }
    }

    const branchColor = BRANCH_COLORS[lane % BRANCH_COLORS.length];

    // Determine commit note conventional commit type
    let commitType = 'feat';
    if (commit.note && commit.note.type) {
      commitType = commit.note.type.toLowerCase();
    } else {
      const subj = commit.subject.toLowerCase();
      if (subj.includes('fix') || subj.includes('bug')) commitType = 'fix';
      else if (subj.includes('refactor')) commitType = 'refactor';
      else if (subj.includes('doc') || subj.includes('readme')) commitType = 'docs';
      else if (subj.includes('test')) commitType = 'test';
      else if (subj.includes('chore') || subj.includes('merge')) commitType = 'chore';
    }

    nodes.push({
      ...commit,
      x,
      y,
      lane,
      color: branchColor,
      commitType,
      index,
    });
  });

  // Second pass: Create connections between child and parent nodes
  nodes.forEach((node) => {
    if (node.parents && node.parents.length > 0) {
      node.parents.forEach((parentSha, parentIdx) => {
        const parentNode = nodes.find(n => n.sha === parentSha || n.sha.startsWith(parentSha));
        if (parentNode) {
          const isMerge = parentIdx > 0;
          const curveColor = isMerge ? BRANCH_COLORS[parentNode.lane % BRANCH_COLORS.length] : node.color;
          
          // Generate SVG cubic Bezier curve path from child to parent
          const x1 = node.x;
          const y1 = node.y;
          const x2 = parentNode.x;
          const y2 = parentNode.y;

          const midY = (y1 + y2) / 2;
          const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

          connections.push({
            id: `${node.sha}->${parentNode.sha}`,
            fromSha: node.sha,
            toSha: parentNode.sha,
            path,
            color: curveColor,
            isMerge,
          });
        }
      });
    }
  });

  return {
    nodes,
    connections,
    laneCount: Math.max(openLanes.length, 1),
    dateMilestones,
    totalHeight: TOP_PADDING + nodes.length * ROW_HEIGHT + 100,
  };
}
