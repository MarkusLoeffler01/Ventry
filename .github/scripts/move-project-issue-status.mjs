const projectUrl = process.env.PROJECT_URL || "https://github.com/orgs/Ventry-io/projects/1";
const statusFieldName = process.env.PROJECT_STATUS_FIELD || "Status";
const statusName = process.env.PROJECT_STATUS_NAME;
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const issueNumbers = (process.env.ISSUE_NUMBERS || "")
  .split(/[,\s]+/)
  .map((value) => Number(value))
  .filter((value) => Number.isInteger(value) && value > 0);

if (!statusName) {
  throw new Error("PROJECT_STATUS_NAME is required.");
}

if (!token) {
  throw new Error("GITHUB_TOKEN is required.");
}

if (!repository) {
  throw new Error("GITHUB_REPOSITORY is required.");
}

if (issueNumbers.length === 0) {
  console.warn("No issue numbers were provided. Nothing to move.");
  process.exit(0);
}

const [owner, repo] = repository.split("/");

async function requestJson(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${options?.method || "GET"} ${url} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function graphql(query, variables) {
  const result = await requestJson("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
    headers: {
      "content-type": "application/json",
    },
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join("; "));
  }

  return result.data;
}

function parseProjectUrl(url) {
  const match = url.match(/^https:\/\/github\.com\/(users|orgs)\/([^/]+)\/projects\/(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported PROJECT_URL: ${url}`);
  }

  return {
    kind: match[1] === "users" ? "user" : "organization",
    login: match[2],
    number: Number(match[3]),
  };
}

async function getProject() {
  const projectRef = parseProjectUrl(projectUrl);
  const ownerQuery = projectRef.kind === "user"
    ? "user(login: $login)"
    : "organization(login: $login)";
  const query = `
    query($login: String!, $number: Int!) {
      owner: ${ownerQuery} {
        projectV2(number: $number) {
          id
          fields(first: 100) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;
  const result = await graphql(query, {
    login: projectRef.login,
    number: projectRef.number,
  });
  const project = result.owner?.projectV2;
  if (!project) throw new Error(`Project not found: ${projectUrl}`);

  const statusField = project.fields.nodes.find((field) => field?.name === statusFieldName);
  if (!statusField) throw new Error(`Project field not found: ${statusFieldName}`);

  const statusOption = statusField.options.find((option) => option.name === statusName);
  if (!statusOption) throw new Error(`Project status option not found: ${statusName}`);

  return {
    id: project.id,
    statusFieldId: statusField.id,
    statusOptionId: statusOption.id,
  };
}

async function getIssueNodeId(issueNumber) {
  const issue = await requestJson(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`);
  return issue.node_id;
}

async function findProjectItem(projectId, issueNodeId) {
  let cursor = null;

  do {
    const result = await graphql(`
      query($projectId: ID!, $cursor: String) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100, after: $cursor) {
              nodes {
                id
                content {
                  ... on Issue {
                    id
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    `, { projectId, cursor });

    const item = result.node.items.nodes.find((candidate) => candidate.content?.id === issueNodeId);
    if (item) return item.id;

    const pageInfo = result.node.items.pageInfo;
    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  return null;
}

async function ensureProjectItem(projectId, issueNodeId) {
  const existingItemId = await findProjectItem(projectId, issueNodeId);
  if (existingItemId) return existingItemId;

  const result = await graphql(`
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item {
          id
        }
      }
    }
  `, { projectId, contentId: issueNodeId });

  return result.addProjectV2ItemById.item.id;
}

async function setProjectStatus(project, itemId) {
  await graphql(`
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `, {
    projectId: project.id,
    itemId,
    fieldId: project.statusFieldId,
    optionId: project.statusOptionId,
  });
}

const project = await getProject();

for (const issueNumber of issueNumbers) {
  const issueNodeId = await getIssueNodeId(issueNumber);
  const itemId = await ensureProjectItem(project.id, issueNodeId);
  await setProjectStatus(project, itemId);
  console.log(`Moved issue #${issueNumber} to ${statusName}.`);
}
