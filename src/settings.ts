module powerbi.extensibility.visual {
    "use strict";
    import DataViewObjectsParser = powerbi.extensibility.utils.dataview.DataViewObjectsParser;

    export class VisualSettings extends DataViewObjectsParser {
      public leafletMap: LeafletMapSettings = new LeafletMapSettings();
    }
    
    export class LeafletMapSettings {
      public defaultColor: string = "";
      public zoomToFit: boolean = true;
    }
}
