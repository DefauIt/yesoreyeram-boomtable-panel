import _ from "lodash";

import { getItemBasedOnThreshold, normalizeColor, replace_tags_from_field } from "./index";
import { IBoomPattern } from "./Boom.interface";

export let getDisplayValueTemplate = function (value: number, pattern: IBoomPattern, seriesName: string, row_col_wrapper: string, thresholds: any[]): string {
    let template = "_value_";
    if (_.isNaN(value) || value === null) {
        template = pattern.null_value || "No data";
        if (pattern.null_value === "") {
            template = "";
        }
    } else {
        template = pattern.displayTemplate || template;
        if (pattern.enable_transform) {
            let transform_values = pattern.transform_values.split("|");
            template = getItemBasedOnThreshold(thresholds, transform_values, value, template);
        }
        if (pattern.enable_transform_overrides && pattern.transform_values_overrides !== "") {
            let _transform_values_overrides = pattern.transform_values_overrides
                .split("|")
                .filter(con => con.indexOf("->"))
                .map(con => con.split("->"))
                .filter(con => +(con[0]) === value)
                .map(con => con[1]);
            if (_transform_values_overrides.length > 0 && _transform_values_overrides[0] !== "") {
                template = ("" + _transform_values_overrides[0]).trim();
            }
        }
        if (pattern.enable_transform || pattern.enable_transform_overrides) {
            template = replaceDelimitedColumns(template, seriesName, pattern.delimiter, row_col_wrapper);
        }
    }
    return template;
};
export let getThresholds = function (thresholdsArray: any[], pattern: IBoomPattern, currentTimeStamp: Date) {
    if (pattern.enable_time_based_thresholds) {
        let metricrecivedTimeStamp = currentTimeStamp || new Date();
        let metricrecivedTimeStamp_innumber = metricrecivedTimeStamp.getHours() * 100 + metricrecivedTimeStamp.getMinutes();
        let weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        _.each(pattern.time_based_thresholds, (tbtx) => {
            if (tbtx && tbtx.from && tbtx.to && tbtx.enabledDays &&
                (metricrecivedTimeStamp_innumber >= +(tbtx.from)) &&
                (metricrecivedTimeStamp_innumber <= +(tbtx.to)) &&
                (tbtx.enabledDays.toLowerCase().indexOf(weekdays[metricrecivedTimeStamp.getDay()]) > -1) &&
                tbtx.threshold
            ) {
                thresholdsArray = (tbtx.threshold + "").split(",").map(d => +d);
            }
        });
    }
    return thresholdsArray;
};
export let getBGColor = function (value: number, pattern: IBoomPattern, thresholds: any[], list_of_bgColors_based_on_thresholds: string[], bgColorOverRides: string[]): string {
    let bgColor = "transparent";
    if (_.isNaN(value) || value === null) {
        bgColor = pattern.null_color || "darkred";
        if (pattern.null_color === "") {
            bgColor = "transparent";
        }
    } else {
        bgColor = pattern.defaultBGColor || bgColor;
        if (pattern.enable_bgColor && pattern.bgColors) {
            bgColor = getItemBasedOnThreshold(thresholds, list_of_bgColors_based_on_thresholds, value, bgColor);

        }
        if (pattern.enable_bgColor_overrides && pattern.bgColors_overrides !== "") {
            let _bgColors_overrides = bgColorOverRides.filter(con => con.indexOf("->")).map(con => con.split("->")).filter(con => +(con[0]) === value).map(con => con[1]);
            if (_bgColors_overrides.length > 0 && _bgColors_overrides[0] !== "") {
                bgColor = ("" + _bgColors_overrides[0]).trim();
            }
        }
    }
    return normalizeColor(bgColor);
};
export let getTextColor = function (value: number, pattern: IBoomPattern, thresholds, list_of_textColors_based_on_thresholds: string, txtColorOverrides: string[]): string {
    let textColor = document.body.classList.contains("theme-light") ? "black" : "white";
    if (_.isNaN(value) || value === null) {
        textColor = pattern.null_textcolor || textColor;
    } else {
        textColor = pattern.defaultTextColor || textColor;
        if (pattern.enable_textColor && pattern.textColors) {
            textColor = getItemBasedOnThreshold(thresholds, list_of_textColors_based_on_thresholds, value, textColor);
        }
        if (pattern.enable_textColor_overrides && pattern.textColors_overrides !== "") {
            let _textColors_overrides = txtColorOverrides.filter(con => con.indexOf("->")).map(con => con.split("->")).filter(con => +(con[0]) === value).map(con => con[1]);
            if (_textColors_overrides.length > 0 && _textColors_overrides[0] !== "") {
                textColor = ("" + _textColors_overrides[0]).trim();
            }
        }
    }
    return normalizeColor(textColor);
};
export let getSeriesValue = function (series: any, statType: string): number {
    let value = NaN;
    if (statType === "last_time") {
        if (_.last(series.datapoints)) {
            value = _.last(series.datapoints)[1];
        }
    } else if (statType === "last_time_nonnull") {
        let non_null_data = series.datapoints.filter(s => s[0]);
        if (_.last(non_null_data) && _.last(non_null_data)[1]) {
            value = _.last(non_null_data)[1];
        }
    } else if (series.stats) {
        value = series.stats[statType] || null;
    }
    return value;
};
export let getLink = function (enable_clickable_cells: boolean, clickable_cells_link: string, range: any): string {
    let link = enable_clickable_cells ? clickable_cells_link || "#" : "#";
    if (link !== "#") {
        link += (link.indexOf("?") > -1 ? `&from=${range.from}` : `?from=${range.from}`);
        link += `&to=${range.to}`;
    }
    return link;
};
export let getCurrentTimeStamp = function (dataPoints: any[]): Date {
    let currentTimeStamp = new Date();
    if (dataPoints && dataPoints.length > 0 && _.last(dataPoints).length === 2) {
        currentTimeStamp = new Date(_.last(dataPoints)[1]);
    }
    return currentTimeStamp;
};
export let doesValueNeedsToHide = function (value: number, pattern: IBoomPattern): boolean {
    let hidden = false;
    if (value && pattern && pattern.filter && (pattern.filter.value_below !== "" || pattern.filter.value_above !== "")) {
        if (pattern.filter.value_below !== "" && value < +(pattern.filter.value_below)) {
            hidden = true;
        }
        if (pattern.filter.value_above !== "" && value > +(pattern.filter.value_above)) {
            hidden = true;
        }
    }
    return hidden;
};
export let replaceDelimitedColumns = function (inputstring: string, seriesName: string, delimiter: string, row_col_wrapper: string): string {
    let outputString = seriesName
        .split(delimiter || ".")
        .reduce((r, it, i) => {
            return r.replace(new RegExp(row_col_wrapper + i + row_col_wrapper, "g"), it);
        }, inputstring);
    return outputString;
};
export let getRowName = function (pattern: IBoomPattern, row_col_wrapper: string, seriesName: string, _metricname: string, _tags: any[]): string {
    let row_name = pattern.row_name;
    if (pattern.delimiter.toLowerCase() === "tag") {
        row_name = row_name.replace(new RegExp("{{metric_name}}", "g"), _metricname);
        row_name = replace_tags_from_field(row_name, _tags);
    } else {
        row_name = replaceDelimitedColumns(row_name, seriesName, pattern.delimiter, row_col_wrapper);
        if (seriesName.split(pattern.delimiter || ".").length === 1) {
            row_name = seriesName;
        }
    }
    return row_name.replace(new RegExp("_series_", "g"), seriesName.toString());
};
export let getColName = function (pattern: IBoomPattern, row_col_wrapper: string, seriesName: string, row_name: string, _metricname: string, _tags: any[]): string {
    let col_name = pattern.col_name;
    if (pattern.delimiter.toLowerCase() === "tag") {
        col_name = col_name.replace(new RegExp("{{metric_name}}", "g"), _metricname);
        row_name = replace_tags_from_field(col_name, _tags);
    } else {
        col_name = replaceDelimitedColumns(col_name, seriesName, pattern.delimiter, row_col_wrapper);
        if (seriesName.split(pattern.delimiter || ".").length === 1 || row_name === seriesName) {
            col_name = pattern.col_name || "Value";
        }
    }
    return col_name.replace(new RegExp("_series_", "g"), seriesName.toString());
};
