import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as github from "@actions/github";
import * as os from "os";
import * as fs from "fs";
import * as path from "path"

const mkdirp = require("mkdirp-promise");

async function run() {
    try {

        // set up auth/environment
        const token = process.env['GITHUB_TOKEN']
        if (!token) {
            throw new Error(
                `No GitHub token found`
            )
        }
        const octokit: github.GitHub = new github.GitHub(token)

        const repo = core.getInput("repo");
        if (!repo) {
            throw new Error(
                `Repo was not specified`
            )
            return;
        }

        const tag = core.getInput("tag");
        if (!tag) {
            throw new Error(
                `Tag not specified`
            )
        }

        const [owner, project] = repo.split("/")

        let osPlatform = "";
        switch (os.platform()) {
            case "linux":
                osPlatform = "linux";
                break;
            case "darwin":
                osPlatform = "darwin";
                break;
            case "win32":
                osPlatform = "windows";
                break;
            default:
                core.setFailed("Unsupported operating system - $this action is only released for Darwin, Linux and Windows");
                return;
        }

        let getReleaseUrl;
        if (tag === "latest") {
            getReleaseUrl = await octokit.repos.getLatestRelease({
                owner: owner,
                repo: project,
            })
        } else {
            getReleaseUrl = await octokit.repos.getReleaseByTag({
                owner: owner,
                repo: project,
                tag: tag,
            })
        }

        let re = new RegExp(`${osPlatform}-amd64`)
        let asset = getReleaseUrl.data.assets.find(obj => {
            return re.test(obj.name)
        })

        if (!asset ) {
            const found = getReleaseUrl.data.assets.map(f => f.name)
            throw new Error(
                `Could not find a release for ${tag}. Found: ${found}`
            )
        }

        const url = asset.browser_download_url

        core.info(`Downloading ${project} from ${url}`)
        const binPath = await tc.downloadTool(url);
	fs.chmodSync(`${binPath}`, '755');
        core.info(`Successfully chmodded ${binPath}`)
	fs.rename( binPath, '/tmp/kubecfg',
		  () => { console.log("\nFile Renamed! Find kubecfg at /tmp/kubecfg\n") })

        // core.addPath(path.basename(binPath));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
