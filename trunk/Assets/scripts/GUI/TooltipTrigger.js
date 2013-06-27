#pragma strict

enum WidgetIDEnum
{
   WIDGET_NONE,
   BUTTON_UNIT_POINT,
   BUTTON_UNIT_HEALER,
   BUTTON_UNIT_SHIELD,
   BUTTON_UNIT_STUNNER,
   BUTTON_ABILITY_HASTE,
   BUTTON_ABILITY_PAINT,
   BUTTON_ABILITY_STUN,
   BUTTON_ABILITY_NUKE,
   BUTTON_EMITTER_HEAVY,
   BUTTON_EMITTER_MEDIUM,
   BUTTON_EMITTER_LIGHT,
   BUTTON_EMITTER_LAUNCH,
   BUTTON_TOWER_LIGHTNING,
   BUTTON_TOWER_MORTAR,
   BUTTON_TOWER_SLOW,
   BUTTON_TOWER_PAINTER,
   BUTTON_TOWER_ATTRIB_STRENGTH,
   BUTTON_TOWER_ATTRIB_FIRERATE,
   BUTTON_TOWER_ATTRIB_RANGE,
   BUTTON_TOWER_SELL,
   BUTTON_TOWER_APPLY
}

class TooltipTriggerData
{
   var id : WidgetIDEnum;
   var text : String;
   var usePanelTooltip : boolean;
   var offset : Vector2;
   var offsetFromWidget : boolean;
   var enterHover : boolean;
   var widget : Transform;
}

var data : TooltipTriggerData;

function Awake()
{
   data.widget = transform;
}

function OnMouseEnter()
{
   data.enterHover = true;
   UIControl.CurrentUI().SendMessage("OnTooltipTrigger", data, SendMessageOptions.DontRequireReceiver);
}

function OnMouseExit()
{
   data.enterHover = false;
   UIControl.CurrentUI().SendMessage("OnTooltipTrigger", data, SendMessageOptions.DontRequireReceiver);
}