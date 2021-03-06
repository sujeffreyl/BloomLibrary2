// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React, { useContext } from "react";
import { LanguageCard, routeToLanguage } from "./LanguageCard";
import Downshift, { GetItemPropsOptions } from "downshift";
import matchSorter from "match-sorter";
import searchIcon from "../search.png";
import { CachedTablesContext } from "../App";
import { ILanguage } from "../model/Language";
import { commonUI } from "../theme";
import { RouterContext } from "../Router";
import { CardSwiper } from "./CardSwiper";

export const LanguageGroup: React.FunctionComponent = () => {
    const router = useContext(RouterContext);
    const { languagesByBookCount: languages } = useContext(CachedTablesContext);

    let filteredLanguages: ILanguage[] = [];

    const getFilteredLanguages = (filter: string | null): ILanguage[] => {
        // MatchSorter is an npm module that does smart autocomplete over a list of values.
        return matchSorter(languages, filter || "", {
            keys: ["englishName", "name", "isoCode"],
        });
    };
    const getFilterLanguagesUI = (
        filter: string | null,
        getItemProps: (options: GetItemPropsOptions<any>) => {}
    ) => {
        filteredLanguages = getFilteredLanguages(filter);
        if (filteredLanguages.length) {
            return (
                <CardSwiper>
                    {filteredLanguages.map((l: any, index: number) => (
                        // TODO: to complete the accessibility, we need to pass the Downshift getLabelProps into LanguageCard
                        // and apply it to the actual label.
                        <LanguageCard
                            {...getItemProps({ item: l })}
                            key={index}
                            name={l.name}
                            englishName={l.englishName}
                            usageCount={l.usageCount}
                            isoCode={l.isoCode}
                            objectId={l.objectId}
                        />
                    ))}
                </CardSwiper>
            );
        } else {
            return (
                <div
                    css={css`
                        height: ${commonUI.languageCardHeightInPx +
                        commonUI.cheapCardMarginBottomInPx -
                        10}px; // 10 matches the padding-top
                        padding-top: 10px;
                        font-size: 0.8rem;
                    `}
                >{`We could not find any book with languages matching '${filter}'`}</div>
            );
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (filteredLanguages.length) {
                routeToLanguage(filteredLanguages[0], router!);
            }
        }
    };
    return (
        <li
            css={css`
                margin-top: 30px;
            `}
        >
            <h1>Find Books By Language</h1>

            {(languages.length && (
                /* Downshift handles telling us when to recompute the list of matching items.
                It also claims to present it all in a WAI-ARIA compliant accessible way (untested).
                We give it a function that returns a react element that contains the
                list of matching cards, and it calls that function on every keystroke. */
                <Downshift>
                    {({
                        getInputProps,
                        getItemProps,
                        inputValue: currentInputBoxText,
                    }) => (
                        <div>
                            <div
                                css={css`
                                    display: flex;
                                    margin-bottom: 2px;
                                    height: 32px;
                                `}
                            >
                                <div
                                    css={css`
                                        display: flex;
                                        border: 1px solid #ccc;
                                        border-radius: 5px;
                                        padding-left: 5px;
                                        margin-right: 10px;
                                        height: 26px;
                                    `}
                                >
                                    <input
                                        css={css`
                                            display: block;
                                            border: 0;
                                        `}
                                        {...getInputProps({
                                            onKeyPress: (e) =>
                                                handleKeyPress(e),
                                        })}
                                        onBlur={() => {
                                            // Overridden.
                                            // Otherwise, the filtered list of cards reverts
                                            // to unfiltered BEFORE the click event, with the result
                                            // that the wrong card is selected.
                                        }}
                                    />
                                    <img src={searchIcon} alt="Search" />
                                </div>

                                <div
                                    css={css`
                                        margin-top: 4px;
                                    `}
                                >{`${languages.length} Languages`}</div>
                            </div>
                            {getFilterLanguagesUI(
                                currentInputBoxText,
                                getItemProps
                            )}
                        </div>
                    )}
                </Downshift>
            )) || (
                // still loading or no response
                <div
                    css={css`
                        height: 100px;
                    `}
                >
                    Loading...
                </div>
            )}
        </li>
    );
};
