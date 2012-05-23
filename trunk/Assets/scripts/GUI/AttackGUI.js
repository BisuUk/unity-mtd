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

         // Mana
         textStyle.normal.textColor = Utility.manaTextColor;
         textStyle.fontSize = 30;
         GUILayout.Label(Game.player.mana.ToString("#0")+"%", textStyle);

         // Button grid
         GUILayout.BeginHorizontal(GUILayout.MinHeight(50));


            if (GUILayout.Button("Stun", GUILayout.ExpandHeight(true)))
            {
               selectedAbility = (selectedAbility == 1) ? 0 : 1;
               if (selectedAbility > 0)
               {
                  GUIControl.NewCursor(3,0);
                  GUIControl.cursorObject.GetComponent(AbilityGUICursor).manaCostPerArea = 3.0;
               }
               else
                  GUIControl.DestroyCursor();
            }
            if (GUILayout.Button("Haste", GUILayout.ExpandHeight(true)))
            {
               selectedAbility = (selectedAbility == 2) ? 0 : 2;
               if (selectedAbility > 0)
               {
                  GUIControl.NewCursor(3,0);
                  GUIControl.cursorObject.GetComponent(AbilityGUICursor).manaCostPerArea = 2.0;
               }
               else
                  GUIControl.DestroyCursor();
            }

            if (GUILayout.Button("Color", GUILayout.ExpandHeight(true)))
            {
               selectedAbility = (selectedAbility == 3) ? 0 : 3;
               if (selectedAbility > 0)
               {
                  GUIControl.NewCursor(3,0);
                  GUIControl.cursorObject.GetComponent(AbilityGUICursor).manaCostPerArea = 2.0;
               }
               else
                  GUIControl.DestroyCursor();
            }


         GUILayout.EndHorizontal();

      GUILayout.EndVertical();
   GUILayout.EndArea();

   if (e.isMouse)
   {
      // Manage ability cursor
      if (GUIControl.cursorObject && !usingGUI)
      {
         var c : AbilityGUICursor = GUIControl.cursorObject.GetComponent(AbilityGUICursor);
         c.color = abilityColor;

         if (c)
         {
            if (e.type == EventType.MouseDown)
            {
               if (e.button == 0)
               {
                  c.SetMode(c.mode+1);
               }
               else if (e.button == 1)
               {
                  if (c.mode == 0)
                     GUIControl.DestroyCursor();
                  else
                     c.SetMode(c.mode-1);
               }
            }
            else if (e.type == EventType.MouseUp)
            {
               if (c.mode == 1)
               {
                  if (c.manaCost <= Game.player.mana)
                  {
                     // Deduct mana cost
                     Game.player.mana -= c.manaCost;
                     // Cast ability
                     if (Network.isServer || (Game.hostType==0))
                        CastAbility(selectedAbility, c.zone.x, c.zone.y, c.zone.width, c.zone.height, abilityColor.r, abilityColor.g, abilityColor.b, new NetworkMessageInfo());
                     else
                        netView.RPC("CastAbility", RPCMode.Server, selectedAbility, c.zone.x, c.zone.y, c.zone.width, c.zone.height, abilityColor.r, abilityColor.g, abilityColor.b);
                  }
                  GUIControl.DestroyCursor();
                  selectedAbility = 0;
               }
            }
         }
      }
      else
      {
         // RMB de-selects
         if (e.type == EventType.MouseDown && e.button == 1)
         {
            attackPanel.enabled = false;
            attackPanel.emitter = null;
            Game.player.selectedEmitter = null;
            selectedAbility = 0;
         }
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

   switch (type)
   {
      case 1:
         var stunZone : AbilityStunTowerZone = abilityObject.GetComponent(AbilityStunTowerZone);
         stunZone.color = Color(r,g,b);
         stunZone.zone = zone;
         stunZone.maxStunDuration = 5.0;
         stunZone.duration = 5.0;
         if (Network.isServer)
            stunZone.netView.RPC("ToClientSetColor", RPCMode.Others, r,g,b);
         break;
      case 2:
         var speedModZone : AbilitySpeedModZone = abilityObject.GetComponent(AbilitySpeedModZone);
         speedModZone.color = Color(r,g,b);
         speedModZone.zone = zone;
         speedModZone.isBuff = true;
         speedModZone.speedMod = 1.0;
         speedModZone.duration = 5.0;
         if (Network.isServer)
            speedModZone.netView.RPC("ToClientSetColor", RPCMode.Others, r,g,b);
         break;
   }
}

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
   if (id!=guiID)
      attackPanel.enabled = false;
}



