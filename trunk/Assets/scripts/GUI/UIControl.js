#pragma strict
#pragma downcast

var UI : Transform[];

var currentUI : int = -1;
var prevUI : int;
var onScreenMessage : UILabel;
var hoverTooltip : Tooltip;
var panelTooltip : Tooltip;

static var self : UIControl;

function Awake()
{
   // No gamedata, return to main menu
   if (!Game.self)
   {
      Debug.Log("GameData not found, returning to mainmenu!");
      if (Application.loadedLevelName != "mainmenu")
      {
         Application.LoadLevel("mainmenu");
         return;
      }
   }

   self = this;
}

function Start()
{
   // Disable all UIs to start
   for (var ui : Transform in UI)
      ui.gameObject.SetActive(false);

   // Switch to main UI
   if (self && Application.loadedLevelName == "mainmenu")
      SwitchUI(0);
}

static function SwitchUI(guiID : int)
{
   Debug.Log("SwitchUI: "+guiID);
   if (!self)
   {
      Debug.Log("SwitchUI: Error no self detected!");
      return;
   }

   if (self.currentUI >= 0 && self.currentUI < self.UI.Length)
   {
      self.prevUI = self.currentUI;
      self.UI[self.currentUI].SendMessage("OnSwitchFrom", SendMessageOptions.DontRequireReceiver);
      self.UI[self.currentUI].gameObject.SetActive(false);
   }

   if (guiID >= 0 && guiID < self.UI.Length)
   {
      self.currentUI = guiID;
      self.UI[self.currentUI].gameObject.SetActive(true);
      self.UI[self.currentUI].SendMessage("OnSwitchTo", SendMessageOptions.DontRequireReceiver);
   }
}

static function GetUI(index : int) : Transform
{
   if (self && index >= 0 && index < self.UI.Length)
   {
      return self.UI[index];
   }
   return null;
}

static function CurrentUI() : Transform
{
   if (self)
      return self.UI[self.currentUI];
   return null;
}

static function OnScreenMessage(message : String, color : Color, duration : float)
{
   if (self && self.onScreenMessage)
   {
      self.onScreenMessage.text = message;
      self.onScreenMessage.color = color;
      self.onScreenMessage.gameObject.SetActive(true);

      var tween : TweenColor = self.onScreenMessage.GetComponent(TweenColor);
      var c : Color = color;
      c.a = 0.0;
      tween.Begin(self.onScreenMessage.gameObject, duration, c);
   }
}

static function Back()
{
   if (self)
      self.SwitchUI(self.prevUI);
}

static function HoverTooltip(text : String, position : Vector2)
{
   self.hoverTooltip.SetText(text, position);
}

static function PanelTooltip(text : String)
{
   self.panelTooltip.SetText(text, Vector2(0,0));
}