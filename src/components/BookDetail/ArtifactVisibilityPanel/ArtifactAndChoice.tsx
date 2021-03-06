import React, { useEffect, useRef } from "react";
import { createStyles, makeStyles } from "@material-ui/styles";
import {
    Button,
    MenuItem,
    FormControl,
    Select,
    FormHelperText
} from "@material-ui/core";
import { ArtifactVisibilitySettings } from "../../../model/ArtifactVisibilitySettings";

import pdfIcon from "./pdf.png";
import epubIcon from "./epub.png";
import bloomReaderIcon from "./bloomd.png";
import readIcon from "../read.svg";
import translationIcon from "../translation.svg";
import { ArtifactType } from "../ArtifactHelper";
import { commonUI } from "../../../theme";
import { useGetLoggedInUser } from "../../../connection/LoggedInUser";

const useStyles = makeStyles(() =>
    createStyles({
        a: {
            textDecoration: "none",
            "&:hover": { textDecoration: "none" }
        },
        artifactAndChoice: {
            padding: 10
        },
        button: {
            width: 100,
            height: 55
        },
        buttonWithText: {
            color: "white",
            textTransform: "none", // prevent all caps
            backgroundColor: commonUI.colors.bloomRed
        },
        buttonWithIconOnly: {
            "& img": { height: 43 } // makes it the same as a button with text
        },
        select: {
            width: 200
        },
        formControl: {
            marginLeft: 50
        }
    })
);

// A button to view/download the artifact, a select box to choose to hide/show it,
// and an optional message giving the user more information about why we would
// hide or show it by default.
export const ArtifactAndChoice: React.FunctionComponent<{
    type: ArtifactType;
    // the parent should give us the settings of the uploader if that is who is logged in,
    // or the moderator otherwise (people who are neither never see this component)
    visibilitySettings: ArtifactVisibilitySettings;
    url: string;
    onChange: (show: string) => void;
    currentUserIsUploader: boolean;
}> = props => {
    const classes = useStyles();
    const user = useGetLoggedInUser();

    const getThisPersonsChoice = (): string => {
        const decisionByThisPerson = props.currentUserIsUploader
            ? props.visibilitySettings.user
            : props.visibilitySettings.librarian;
        if (decisionByThisPerson === undefined) {
            return "auto";
        }
        return decisionByThisPerson ? "show" : "hide";
    };

    const [thisPersonsChoice, setThisPersonsChoice] = React.useState(
        getThisPersonsChoice()
    );
    const isFirstRun = useRef(true);
    useEffect(() => {
        // Do not call onChange during component mount
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        props.onChange(thisPersonsChoice);
    }, [thisPersonsChoice, props]);

    const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setThisPersonsChoice(event.target.value as string);
    };

    const getAutoText = (): string => {
        let showOrNot = "Show";
        if (
            props.visibilitySettings &&
            !props.visibilitySettings.getDecisionSansUser()
        ) {
            showOrNot = "Hide";
        }
        return `Automatic (${showOrNot})`;
    };

    const getRationaleText = (): string => {
        // console.log(
        //     "ArtifactAndChoice from getRationalText():" + JSON.stringify(props)
        // );
        // console.log(
        //     "getRationalText():" +
        //         props.visibilitySettings.hasUserDecided().toString()
        // );
        if (!props.visibilitySettings) {
            return "";
        }
        //console.log("abc:" + props.visibility.hasUserDecided());
        if (
            !props.currentUserIsUploader &&
            props.visibilitySettings.hasUserDecided()
        ) {
            return `The uploader has determined that this should be "${
                props.visibilitySettings.isUserHide() ? "Hide" : "Show"
            }" and currently staff cannot override that.`;
        }
        if (props.visibilitySettings.hasLibrarianDecided()) {
            return `Bloom staff has determined that this should be "${
                props.visibilitySettings.isLibrarianHide() ? "Hide" : "Show"
            }"`;
        }
        if (props.visibilitySettings.hasHarvesterDecided()) {
            return `Our system has guessed that this should be "${
                props.visibilitySettings.isHarvesterHide() ? "Hide" : "Show"
            }"`;
        }
        return "";
    };

    const getArtifactIcon = (): React.ReactNode => {
        let src;
        let alt;
        switch (props.type) {
            case ArtifactType.pdf:
                src = pdfIcon;
                alt = "PDF";
                break;
            case ArtifactType.epub:
                src = epubIcon;
                alt = "epub";
                break;
            case ArtifactType.bloomReader:
                src = bloomReaderIcon;
                alt = "Bloom Reader";
                break;
            case ArtifactType.readOnline:
                src = readIcon;
                alt = "Read online";
                break;
            case ArtifactType.shellbook:
                src = translationIcon;
                alt = "Download Translation";
                break;
        }
        return <img src={src} alt={alt} />;
    };

    const getArtifactButtonText = (): string | undefined => {
        if (props.type === "readOnline") {
            return "Read";
        }
        return undefined;
    };

    const getButton = (): React.ReactNode => {
        const text = getArtifactButtonText();
        if (text) {
            return (
                <Button
                    variant="outlined"
                    className={`${classes.button} ${classes.buttonWithText}`}
                    startIcon={getArtifactIcon()}
                >
                    {text}
                </Button>
            );
        }
        return (
            <Button
                variant="outlined"
                className={`${classes.button} ${classes.buttonWithIconOnly}`}
            >
                {getArtifactIcon()}
            </Button>
        );
    };

    const isInternalUrl = (): boolean => {
        return props.url.startsWith("/");
    };

    return (
        <div className={classes.artifactAndChoice}>
            <a
                href={props.url}
                target={isInternalUrl() ? undefined : "_blank"}
                className={classes.a}
            >
                {getButton()}
            </a>
            <FormControl className={classes.formControl}>
                <Select
                    value={thisPersonsChoice}
                    onChange={handleChange}
                    autoWidth
                    className={classes.select}
                    disabled={
                        // currently the user always wins, so disable these controls if we're seeing them because
                        // we are a moderator.
                        props.visibilitySettings.hasUserDecided() &&
                        !props.currentUserIsUploader
                    }
                >
                    <MenuItem value="auto">{getAutoText()}</MenuItem>
                    <MenuItem value="show">Show</MenuItem>
                    <MenuItem value="hide">Hide</MenuItem>
                </Select>
                <FormHelperText>
                    {(thisPersonsChoice === "auto" ||
                        // we show this for moderators even if not on auto because a moderator can currently be
                        // overridden by the uploader, and this can be confusing.
                        user?.moderator) &&
                        getRationaleText()}
                </FormHelperText>
            </FormControl>
        </div>
    );
};
