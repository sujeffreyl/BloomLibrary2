// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React, { useContext, useEffect, useCallback } from "react";
import { useGetBookDetail } from "../connection/LibraryQueryHooks";
import { Book } from "../model/Book";
import { RouterContext } from "../Router";
import { getUrlOfHtmlOfDigitalVersion } from "./BookDetail/ArtifactHelper";

export const ReadBookPage: React.FunctionComponent<{ id: string }> = (
    props
) => {
    const router = useContext(RouterContext);

    const handleMessageFromBloomPlayer = useCallback(
        (event: MessageEvent) => {
            //        console.log(JSON.stringify(event.data));
            try {
                const r = JSON.parse(event.data);
                if (r.messageType === "backButtonClicked") {
                    router!.push({
                        bookId: router!.current.bookId,
                        title: "Book Detail",
                        pageType: "book-detail",
                        filter: {},
                    });
                }
            } catch (err) {
                console.log(`Got error with message: ${err}`);
            }
        },
        [router]
    );

    useEffect(() => {
        window.addEventListener("message", handleMessageFromBloomPlayer);
        return () => {
            window.removeEventListener("message", handleMessageFromBloomPlayer);
        };
    }, [handleMessageFromBloomPlayer]);

    const book = useGetBookDetail(props.id);
    const url = book ? getUrlOfHtmlOfDigitalVersion(book) : "working"; // url=working shows a loading icon

    // use the bloomplayer.htm we copy into our public/ folder, where CRA serves from
    const bloomPlayerUrl = "bloom-player/bloomplayer.htm";

    const langParam = router?.current.contextLangIso
        ? `&lang=${router.current.contextLangIso}`
        : "";

    const iframeSrc = `${bloomPlayerUrl}?url=${url}&showBackButton=true&useOriginalPageSize=true${langParam}`;

    return (
        <iframe
            title="bloom player"
            css={css`
                border: none;
                width: 100%;
                height: 100%;
            `}
            src={iframeSrc}
        ></iframe>
    );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getHarvesterBaseUrl(book: Book) {
    // typical input url:
    // https://s3.amazonaws.com/BloomLibraryBooks-Sandbox/ken%40example.com%2faa647178-ed4d-4316-b8bf-0dc94536347d%2fsign+language+test%2f
    // want:
    // https://s3.amazonaws.com/bloomharvest-sandbox/ken%40example.com%2faa647178-ed4d-4316-b8bf-0dc94536347d/
    // We come up with that URL by
    //  (a) changing BloomLibraryBooks{-Sandbox} to bloomharvest{-sandbox}
    //  (b) strip off everything after the next-to-final slash
    let folderWithoutLastSlash = book.baseUrl;
    if (book.baseUrl.endsWith("%2f")) {
        folderWithoutLastSlash = book.baseUrl.substring(
            0,
            book.baseUrl.length - 3
        );
    }
    const index = folderWithoutLastSlash.lastIndexOf("%2f");
    const pathWithoutBookName = folderWithoutLastSlash.substring(0, index);
    return (
        pathWithoutBookName
            .replace("BloomLibraryBooks-Sandbox", "bloomharvest-sandbox")
            .replace("BloomLibraryBooks", "bloomharvest") + "/"
    );
    // Using slash rather than %2f at the end helps us download as the filename we want.
    // Otherwise, the filename can be something like ken@example.com_007b3c03-52b7-4689-80bd-06fd4b6f9f28_Fox+and+Frog.bloomd
}
