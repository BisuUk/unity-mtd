#pragma strict
#pragma downcast

import CustomWidgets;

var attackPanel : AttackGUIPanel;
var colorCircle : Texture2D;
var textStyle : GUIStyle;
var selectedAbility : int;
var abilityColor : Color = Color.white;
var netView : NetworkView;

static var guiID : int = 2;

private var usingGUI : boolean;
private var abilityTypeStrings : String[] = ["Haste", "Stun"];


function OnGUI()
{
   if (Application.isLoadingLevel)
      return;

   usingGUI = false;

   var e : Event = Event.current;

   GUILayout.BeginArea(Rect(AttackGUIPanel.panelWidth+10, Screen.height-60, 200, 60));
      GUILayout.BeginHorizontal();
            // Credits
            textStyle.normal.textColor = Utility.creditsTextColor;
            textStyle.fontSize = 30;
            GUILayout.Label(GUIContent(Game.player.credits.ToString(), "Credits"), textStyle);
      GUILayout.EndHorizontal();
   GUILayout.EndArea();

   // Tower type panel
   GUILayout.BeginArea(Rect(Screen.width*0.6, Screen.height-300, 200, 300));
      GUILayout.BeginVertical();

         GUILayout.FlexibleSpace(); // push everything down

         //boxSelector.enabled = (selectedAbility > 0);

         // Color Wheel
         if (selectedAbility > 0)
         {
            var newlySelectedColor : Color = RGBCircle(abilityColor, "", colorCircle);
            if (newlySelectedColor != abilityColor)
            {
               abilityColor = newlySelectedColor;
               usingGUI = true;
            }
         }

/*
         // Mana
         textStyle.normal.textColor = Utility.manaTextColor;
         textStyle.fontSize = 30;
         GUILayout.Label(Game.player.mana.ToString("#0")+"%", textStyle);
*/
         // Ability button grid
         GUILayout.BeginHorizontal(GUILayout.MinHeight(50));
            var newAbilityButton : int = GUILayout.SelectionGrid((selectedAbility-1), abilityTypeStrings, 3, GUILayout.ExpandHeight(true));
            if (newAbilityButton != (selectedAbility-1))
            {
               selectedAbility = newAbilityButton+1;
               GUIControl.NewCursor(3,selectedAbility);
            }
         GUILayout.EndHorizontal();

      GUILayout.EndVertical();
   GUILayout.EndArea();

   // Mouse input handling
   if (e.isMouse)
   {
      // Manage ability cursor
      if (GUIControl.cursorObject && !usingGUI)
      {
         var c : AbilityBase = GUIControl.cursorObject.GetComponent(AbilityBase);
         c.color = abilityColor;

         if (c)
         {
            if (e.type == EventType.MouseDown)
            {
               if (e.button == 0)
                  c.SetMode(c.clickMode+1);
            }
            else if (e.type == EventType.MouseUp)
            {
               if (c.clickMode == 1)
               {
                  if (c.cost <= Game.player.credits)
                  {
                     // Deduct mana cost
                     Game.player.credits -= c.cost;
                     // Cast ability
                     if (Network.isServer || (Game.hostType==0))
                        CastAbility(selectedAbility, c.zone.x, c.zone.y, c.zone.width, c.zone.height, abilityColor.r, abilityColor.g, abilityColor.b, new NetworkMessageInfo());
                     else
                        netView.RPC("CastAbility", RPCMode.Server, selectedAbility, c.zone.x, c.zone.y, c.zone.width, c.zone.height, abilityColor.r, abilityColor.g, abilityColor.b);
                     // Kill ability gui on successful cast
                     GUIControl.NewCursor(3,selectedAbility);
                     //ResetAbility();
                  }
                  else // couldn't afford so reset cursor, don't deselect ability
                  {
                     GUIControl.NewCursor(3,selectedAbility);
                  }
               }
            }
         }
      }

      // RMB de-selects
      if (e.type == EventType.MouseDown && e.button == 1)
      {
         if (GUIControl.cursorObject)
         {
            ResetAbility();
         }
         else // no cursor, close attack panel
         {
            attackPanel.enabled = false;
            attackPanel.emitter = null;
            Game.player.selectedEmitter = null;
         }
      }
   }

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.F1:
         selectedAbility = 1;
         GUIControl.NewCursor(3,selectedAbility);
         break;

      case KeyCode.F2:
         selectedAbility = 2;
         GUIControl.NewCursor(3,selectedAbility);
         break;

      case KeyCode.Escape:
         if (GUIControl.cursorObject)
         {
            ResetAbility();
         }
         // no cursor, close attack panel
         else if (attackPanel.enabled)
         {
            attackPanel.enabled = false;
            attackPanel.emitter = null;
            Game.player.selectedEmitter = null;
         }
         else
         {
            GUIControl.SwitchGUI(0);
         }
         break;
      }
   }
}

@RPC
function CastAbility(type : int, x : float, y : float, w : float, h : float, r : float, g : float, b : float, info : NetworkMessageInfo)
{
   var abilityObject : GameObject;

   if (Network.isServer)
      abilityObject = Network.Instantiate(Resources.Load(Utility.GetAbilityPrefabName(type), GameObject), Vector3.zero, Quaternion.identity, 0);
   else
      abilityObject = Instantiate(Resources.Load(Utility.GetAbilityPrefabName(type), GameObject), Vector3.zero, Quaternion.identity);

   var zone : Rect = Rect(x, y, w, h);
   abilityObject.name = "AbilityObject";
   abilityObject.transform.localScale = Vector3(zone.width, 1, zone.height);
   abilityObject.transform.position.x = zone.center.x;
   abilityObject.transform.position.z = zone.center.y;
   abilityObject.SendMessage("MakeCursor", false);

   var base : AbilityBase = abilityObject.GetComponent(AbilityBase);
   base.color = Color(r,g,b);
   base.zone = zone;
   base.SetColor(r,g,b);
   if (Network.isServer)
      base.netView.RPC("SetColor", RPCMode.Others, r,g,b);
}

function ResetAbility()
{
   selectedAbility = 0;
   GUIControl.DestroyCursor();
}

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
   if (id!=guiID)
      attackPanel.enabled = false;
}



