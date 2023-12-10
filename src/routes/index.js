const { findUser } = require("../../database/controllers/user.controller.js");
const Repo = require("../../database/models/repo.model.js");
const github_helpers = require("../../providers/github/APICalls.js");
const gitlab_helpers = require("../../providers/gitlab/APICalls.js");
const {
  githubAuth,
  githubAuthCallback,
  gitlabAuth,
  gitlabAuthCallback,
} = require("../../providers");

const reposToBadge = async (req, res) => {
  const selectedRepos = (await req.body.repos) || [];
  const userId = req.body.userId;
  const provider = req.body.provider;

  if (!provider) {
    res.status(400).send("provider missing");
    return;
  }

  if (!userId) {
    res.status(400).send("userId missing");
    return;
  }

  let user = null;
  try {
    user = await findUser(userId);
    if (!user) {
      res.status(404).json("User not found");
      return;
    }
  } catch (error) {
    res.status(500).json("Error fetching user data");
    return;
  }

  // Process the selected repos as needed
  if (provider === "github") {
    const results = await github_helpers.scanRepositories(
      user.id,
      user.name,
      user.email,
      selectedRepos
    );
    res.status(200).json({ results });
  } else if (provider === "gitlab") {
    const results = await gitlab_helpers.scanRepositories(
      user.id,
      user.name,
      user.email,
      selectedRepos
    );
    res.status(200).json({ results });
  } else {
    res.status(400).send(`Unknown provider: ${provider}`);
  }
};

const badgedRepos = async (req, res) => {
  try {
    // Use Sequelize to find all repos, excluding the DEICommitSHA field
    const repos = await Repo.findAll({
      attributes: { exclude: ["DEICommitSHA"] },
    });

    // Extract the relevant information from the repos
    const formattedRepos = repos.map((repo) => ({
      id: repo.id,
      githubRepoId: repo.githubRepoId,
      repoLink: repo.repoLink,
      badgeType: repo.badgeType,
      attachment: repo.attachment,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      userId: repo.userId,
    }));

    res.json(formattedRepos);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving repos", error });
  }
};

const setupRoutes = (app) => {
  app.get("/api/auth/github", (req, res) => {
    githubAuth(req, res);
  });

  app.get("/api/auth/gitlab", (req, res) => {
    gitlabAuth(req, res);
  });

  //redirects
  app.get("/api/callback/github", (req, res) => {
    githubAuthCallback(req, res);
  });

  app.get("/api/badgedRepos", badgedRepos);
  app.post("/api/repos-to-badge", reposToBadge);

  // github_routes.setupGitHubRoutes(app);
  gitlabAuthCallback(app);
};

module.exports = {
  setupRoutes,
};
