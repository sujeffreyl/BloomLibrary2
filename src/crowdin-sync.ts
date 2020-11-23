/*
Upload the localization source file(s) to Crowdin, request a wait for a build
from Crowdin, then download the build and unpack it into the build/translations
directory.

Normally this is run on our CI build server using `yarn ts-node ./build/crowdin-sync.ts`
*/

import crowdin from "@crowdin/crowdin-api-client";
import download from "download";
import tempDirectory from "temp-dir";
import decompress from "decompress";
import * as Path from "path";
import * as fs from "fs-extra";

//import * as Retry from "async-retry";
const Retry = require("async-retry");

const kTargetDirectory = "./build/translations";

const crowdinApiToken: string = process.env.bloomCrowdinApiToken || "";
const kCrowdinProjectId = 261564;

async function requestAndWaitForCrowdinBuild(): Promise<number | undefined> {
    const crowdinAccess = new crowdin({
        token: crowdinApiToken,
    });

    try {
        console.log("Requesting a crowdin build...");
        const buildRequestResult = await crowdinAccess.translationsApi.buildProject(
            kCrowdinProjectId,
            {
                // NOTE: there is a problem with these... they may be ignored: https://github.com/crowdin/crowdin-api-client-js/issues/85
                exportApprovedOnly: true, /// TODO
                skipUntranslatedStrings: true,
            }
        );
        console.log(JSON.stringify(buildRequestResult, null, 4));

        // The way this api works is, normally it just finds a build on their server and tells you it's there.
        // But sometimes it will have to go prepare the build for around a minute. In that case, you have to
        // keep checking until it is done. Here we check every 5 seconds for up to 10 minutes.
        const buildId = await Retry(
            async (bail: any) => {
                console.log("Checking build status...");
                const statusResult = await crowdinAccess.translationsApi.checkBuildStatus(
                    kCrowdinProjectId,
                    buildRequestResult.data.id
                );
                if (statusResult.data.status === "finished")
                    // we don't actually need a result, but that is how this async-retry knows to stop retrying
                    return statusResult.data.id;

                if (["canceled", "failed"].includes(statusResult.data.status)) {
                    bail(
                        new Error(`Build failed (${statusResult.data.status})`)
                    );
                }
                // otherwise, we'll retry.
                console.log(`${statusResult.data.progress} %`);
                throw new Error("not really an error, but need to retry");
            },
            {
                retries: 60,
                minTimeout: 5 * 1000,
            }
        );
        return buildId;
    } catch (err) {
        console.error(
            "error getting crowdin to start a new build: " +
                JSON.stringify(err, null, 4)
        );
        return undefined;
    }
}

// Given the id of a known crowdin build that is available, we can download and unzip it into place.
async function downloadAndUnpackCrowdinBuild(crowdinBuildId: number) {
    const crowdinAccess = new crowdin({
        token: crowdinApiToken,
    });
    try {
        const buildInfo = await crowdinAccess.translationsApi.downloadTranslations(
            kCrowdinProjectId,
            crowdinBuildId
        );
        console.log("buildInfo:");
        console.log(JSON.stringify(buildInfo, null, 4));
        if (!buildInfo.data.url) {
            console.error(
                `Error: The Crowdin Build did not give a url. Is the build finished?`
            );
            return;
        }
        const url = buildInfo.data.url;
        console.log("downloading from " + url);
        await download(url, tempDirectory);
        console.log("download complete");

        await decompress(
            Path.join(tempDirectory, "SIL-Bloom.zip"),
            kTargetDirectory,
            {
                filter: (f) => {
                    return f.path.indexOf("BloomLibrary.org") > -1;
                },
            }
        );
    } catch (err) {
        console.error("error: " + JSON.stringify(err, null, 4));
    }
}

/**
 * Remove directory recursively
 * @param {string} directory
 * @see https://stackoverflow.com/a/42505874/3027390
 */
function rimraf(directory: string) {
    if (fs.existsSync(directory)) {
        fs.readdirSync(directory).forEach((entry) => {
            const entryPath = Path.join(directory, entry);
            if (fs.lstatSync(entryPath).isDirectory()) {
                rimraf(entryPath);
            } else {
                fs.unlinkSync(entryPath);
            }
        });
        fs.rmdirSync(directory);
    }
}

async function go() {
    if (fs.pathExistsSync(kTargetDirectory)) rimraf(kTargetDirectory);
    const buildId = await requestAndWaitForCrowdinBuild();
    console.log("build id: " + buildId);
    if (buildId) {
        downloadAndUnpackCrowdinBuild(buildId);
    }
}

go();
