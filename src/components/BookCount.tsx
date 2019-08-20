import React from "react";
import {
    useGetBookCount,
    getResultsOrMessageElement
} from "./LibraryQueryHooks";
import { IFilter } from "../IFilter";
import { HtmlAttributes } from "csstype";

export const BookCount: React.FunctionComponent<{
    message?: string;
    filter: IFilter;
    //ClassName?: string;
}> = props => {
    const queryResultElements = useGetBookCount(props.filter);
    const { noResultsElement, count } = getResultsOrMessageElement(
        queryResultElements
    );
    return (
        noResultsElement || (
            <>
                {props.message
                    ? props.message.replace("{0}", count)
                    : `${count} Books`}
            </>
        )
    );
};
