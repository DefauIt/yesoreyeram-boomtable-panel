import {
    MetricsPanelCtrl
} from "app/plugins/sdk";
import TimeSeries from "app/core/time_series2";

const plugin_id = "yesoreyeram-boomtable-panel";
const config = {
    plugin_id: plugin_id,
    panelDefaults: {
        plugin_title: "Boom Table",
        nullPointMode: "connected"
    }
};

export {
    MetricsPanelCtrl,
    TimeSeries,
    config
}