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
   BUTTON_EMITTER_LIGHT
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

function OnHover(enterHover : boolean)
{
   data.enterHover = enterHover;
   UIControl.CurrentUI().SendMessage("OnTooltipTrigger", data, SendMessageOptions.DontRequireReceiver);
}