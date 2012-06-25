#pragma strict
#pragma downcast

import CustomWidgets;

var defendPanel : DefendGUIPanel;
var textStyle : GUIStyle;
var colorCircle : Texture2D;
var selectedAbility : int;
var abilityColor : Color = Color.white;
var netView : NetworkView;

static var selectedTypeButton : int = -1;
static var guiID : int = 3;

private var abilityGUIEvent : boolean;
private var towerTypeStrings : String[] = ["Direct", "AoE"];
private var towerToSelect : Tower = null;
private var abilityTypeStrings : String[] = ["Paint"];


function SelectTower(tower : Tower)
{
   // Set for next GUI cycle so we can detect alt/shift clicks
   towerToSelect = tower;
}

function OnGUI()
{
   if (Application.isLoadingLevel)
      return;

   abilityGUIEvent = false;

   var e : Event = Event.current;

   if (towerToSelect && GUIControl.cursorObject==null)
   {
      if (Game.player.selectedTowers.Contains(towerToSelect))
      {
         if (e.shift)
            Game.player.DeselectTower(towerToSelect);
         else
            Game.player.SelectTower(towerToSelect, false);
      }
      else
         Game.player.SelectTower(towerToSelect, (e.shift));

      if (Game.player.selectedTowers.Count == 0)
         defendPanel.enabled = false;
      else if (Game.player.selectedTowers.Count > 1)
         defendPanel.SetMultiTower();
      else
         defendPanel.SetTower(towerToSelect, (e.alt));
      // Clear from next GUI cycle
      towerToSelect = null;
   }

   // If panel is not open, unpress buttons
   if (defendPanel.enabled == false)
      selectedTypeButton = -1;

   // Tower type panel
   GUILayout.BeginArea(Rect(DefendGUIPanel.panelWidth+100, Screen.height-120, 200, 120));
      GUILayout.BeginVertical();

         GUILayout.FlexibleSpace(); // push everything down

         // Credits
         textStyle.normal.textColor = Color(0.2,1.0,0.2);
         textStyle.fontSize = 30;
         GUILayout.Label(Game.player.credits.ToString(), textStyle);

         // Button grid
         var newTowerTypeButton : int = GUILayout.SelectionGrid(-1, towerTypeStrings, 3, GUILayout.MinHeight(50));
         if (newTowerTypeButton != -1)
            PressNewTower(newTowerTypeButton);
      GUILayout.EndVertical();
   GUILayout.EndArea();


   GUILayout.BeginArea(Rect(Screen.width*0.6, Screen.height-300, 200, 300));
      GUILayout.BeginVertical();

         GUILayout.FlexibleSpace(); // push everything down

         // Color Wheel
         if (selectedAbility > 0)
         {
            var newlySelectedColor : Color = RGBCircle(abilityColor, "", colorCircle);
            if (newlySelectedColor != abilityColor)
            {
               abilityColor = newlySelectedColor;
               abilityGUIEvent = true;
            }
         }

         // Ability button grid
         GUILayout.BeginHorizontal(GUILayout.MinHeight(50));
            var newAbilityButton : int = GUILayout.SelectionGrid((selectedAbility-1), abilityTypeStrings, 3, GUILayout.ExpandHeight(true));
            if (newAbilityButton != (selectedAbility-1))
               PressAbility(newAbilityButton+1);
         GUILayout.EndHorizontal();

      GUILayout.EndVertical();
   GUILayout.EndArea();

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.Alpha1:
      case KeyCode.Keypad1:
         PressNewTower(0);
         break;

      case KeyCode.Alpha2:
      case KeyCode.Keypad2:
         PressNewTower(1);
         break;

      case KeyCode.F1:
         PressAbility(1);
         break;

      case KeyCode.Escape:
         // no cursor, close attack panel
         if (defendPanel.enabled)
         {
            Game.player.ClearSelectedTowers();
            GUIControl.DestroyCursor();
            defendPanel.enabled = false;
         }
         else
         {
            GUIControl.SwitchGUI(0);
         }
         break;
      }
   }

   if (e.isMouse) // Mouse input handling
   {
      // Manage ability cursor
      if (GUIControl.cursorObject && selectedAbility>0 && !abilityGUIEvent)
      {
         var c : AbilityBase = GUIControl.cursorObject.GetComponent(AbilityBase);
         c.SetColor(abilityColor.r, abilityColor.g, abilityColor.b);

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
                        CastAbility(selectedAbility, c.transform.position, c.transform.localScale, abilityColor.r, abilityColor.g, abilityColor.b, new NetworkMessageInfo());
                     else
                        netView.RPC("CastAbility", RPCMode.Server, selectedAbility, c.transform.position, c.transform.localScale, abilityColor.r, abilityColor.g, abilityColor.b);
                  }
                  // Reset ability
                  PressAbility(selectedAbility);
               }
            }
         }
      }

      // RMB de-selects
      if (e.type == EventType.MouseDown && e.button == 1)
      {
         if (GUIControl.cursorObject && selectedAbility>0)
         {
            ResetAbility();
         }
      }
   }
}

function PressAbility(ability : int)
{
   selectedAbility = ability;
   Game.player.ClearSelectedTowers();
   defendPanel.enabled = false;
   GUIControl.NewCursor(3,selectedAbility+100);
   GUIControl.cursorObject.GetComponent(AbilityBase).SetColor(abilityColor.r, abilityColor.g, abilityColor.b);
}

function PressNewTower(type : int)
{
   // Making a new tower, open panel
   Game.player.ClearSelectedTowers();
   selectedTypeButton = type;
   defendPanel.SetNew(type+1);
   selectedAbility = 0;
}

@RPC
function CastAbility(type : int, pos : Vector3, scale : Vector3, r : float, g : float, b : float, info : NetworkMessageInfo)
{
   var abilityObject : GameObject;

   if (Network.isServer)
      abilityObject = Network.Instantiate(Resources.Load(AbilityBase.GetPrefabName(type+100), GameObject), pos, Quaternion.identity, 0);
   else
      abilityObject = Instantiate(Resources.Load(AbilityBase.GetPrefabName(type+100), GameObject), pos, Quaternion.identity);

   abilityObject.name = "AbilityObject";
   abilityObject.transform.localScale = scale;
   //abilityObject.transform.position = pos;
   abilityObject.SendMessage("MakeCursor", false);

   var base : AbilityBase = abilityObject.GetComponent(AbilityBase);
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
      defendPanel.enabled = false;
}
