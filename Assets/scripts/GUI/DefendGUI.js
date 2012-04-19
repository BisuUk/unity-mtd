#pragma strict
#pragma downcast

import CustomWidgets;

var colorCircle : Texture2D;
var previewCamera : GameObject;
var previewItemPos : Transform;
var netView : NetworkView;
static var selectedColor : Color = Color.black;
static var selectedRange  : float;
static var selectedRate  : float;
static var selectedFOV  : float;
static var selectedDamage  : float;
static var selectedBehavior : int;
static var selectedType : int;
static var pulsateValue : float = 0.0;
static var pulsateDuration : float = 0.25;

private var previewItem : GameObject;
private var towerTypeStrings : String[] = ["Laser", "Ranged", "Area"];
private var behaviourStrings : String[] = ["Weak", "Close", "Best"];
private var selectedTypeButton : int = -1;
private var lastSelTower : Tower = null;
private var cursorTower : Tower = null;
private var costValue : int = 0;
private var timeValue : float = 0;
private var recalcCosts : boolean = false;
private var lastTooltip : String = " ";

@RPC
function CreateTower(towerType : int, pos : Vector3, rot : Quaternion,
                     range : float, fov : float, rate : float, damage : float,
                     colorRed : float, colorGreen : float, colorBlue : float)
{
   var prefabName : String = TowerUtil.PrefabName(towerType);
   var newTower : GameObject;

   if (GameData.hostType > 0)
      newTower = Network.Instantiate(Resources.Load(prefabName, GameObject), pos, rot, 0);
   else
      newTower = Instantiate(Resources.Load(prefabName, GameObject), pos, rot);
   var t : Tower = newTower.GetComponent(Tower);

   t.Initialize(range, fov, rate, damage, Color(colorRed, colorGreen, colorBlue));
}


function OnGUI()
{
   var panelWidth : float = Screen.width*0.20;
   var panelHeight : float  = Screen.height*0.80;
   var previewHeight : float = Screen.height-panelHeight;
   var e : Event = Event.current;
   var panelVisible : boolean = false;
   var textStyle : GUIStyle = new GUIStyle();
   var towerAttr : TowerAttributes;
   var selTower : Tower = null;

   // Font style
   textStyle.fontStyle = FontStyle.Bold;
   textStyle.alignment = TextAnchor.MiddleCenter;

   if (GameData.player.selectedTower)
   {
      panelVisible = true;
      selTower = GameData.player.selectedTower.GetComponent(Tower);
      towerAttr = selTower.base;

      // A new tower was selected
      if (selTower != lastSelTower)
      {
         selectedRange = selTower.range;
         selectedRate = selTower.fireRate;
         selectedDamage = selTower.damage;
         selectedColor = selTower.color;
         lastSelTower = selTower;
         recalcCosts = true;
      }
      else if (recalcCosts)
      {
         // Changing a fielded tower's attributes
         costValue = selTower.GetCurrentCost();
         timeValue = selTower.GetCurrentTimeCost();
         var possibleCostValue : int = selTower.GetCost(selectedRange, selectedRate, selectedDamage);
         possibleCostValue += selTower.GetColorDeltaCost(selTower.color, selectedColor);
         var possibleTimeCostValue : float = selTower.GetTimeCost(selectedRange, selectedRate, selectedDamage);
         possibleTimeCostValue += selTower.GetColorDeltaTimeCost(selTower.color, selectedColor);

         costValue = Mathf.FloorToInt(costValue - possibleCostValue);
         timeValue = Mathf.Abs(timeValue - possibleTimeCostValue);
         recalcCosts = false;
      }

      // Remove cursor
      GUIControl.DestroyCursor();
      cursorTower = null;
   }
   else if (GUIControl.cursorObject) // New tower being built
   {
      panelVisible = true;
      // Placing a new tower
      cursorTower = GUIControl.cursorObject.GetComponent(Tower);
      towerAttr = cursorTower.base;
      selectedRange = cursorTower.range;
      selectedRate = cursorTower.fireRate;
      selectedDamage = cursorTower.damage;
      if (recalcCosts)
      {
         costValue = cursorTower.GetCost(selectedRange, selectedRate, selectedDamage);
         costValue += cursorTower.GetColorDeltaCost(Color.white, selectedColor);
         costValue *= -1;
         timeValue = cursorTower.GetTimeCost(selectedRange, selectedRate, selectedDamage);
         timeValue += cursorTower.GetColorDeltaTimeCost(Color.white, selectedColor);
         recalcCosts = false;
      }
   }
   else  // Nothing selected
   {
      panelVisible = false;
      lastSelTower = null;
      cursorTower = null;
   }

   // Tower type panel
   GUILayout.BeginArea(Rect(panelWidth+100, Screen.height-200, Screen.width, 200));
      GUILayout.BeginVertical(GUILayout.Width(panelWidth-4), GUILayout.Height(200));

         GUILayout.FlexibleSpace(); // push everything down

         // Credits
         textStyle.normal.textColor = Color(0.2,1.0,0.2);
         textStyle.fontSize = 30;
         GUILayout.Label(GameData.player.credits.ToString(), textStyle);

         // Button grid
         var newTowerTypeButton : int = GUILayout.SelectionGrid(selectedTypeButton, towerTypeStrings, 3, GUILayout.MinHeight(50));
         if (newTowerTypeButton != selectedTypeButton)
         {
            GameData.player.selectedTower = null;
            selectedTypeButton = newTowerTypeButton;
            selectedColor = Color.white;
            recalcCosts = true;

            GUIControl.NewCursor(2,selectedTypeButton+1);
            NewPreviewItem(selectedTypeButton+1);
         }
      GUILayout.EndVertical();
   GUILayout.EndArea();


   // Mouseover testing, for sell button to show sell cost
   if (Event.current.type == EventType.Repaint && GUI.tooltip != lastTooltip)
   {
      // Just moused over sell button
      if (GUI.tooltip == "SellButton")
      {
         costValue = selTower.GetCurrentCost();
         costValue += selTower.GetColorDeltaCost(Color.white, selectedColor);
      }
      else if (lastTooltip == "SellButton")
      {
         // Just moused off of the sell button, recalc costs
         recalcCosts = true;
      }
      // Remember the last widget we've moused over
      lastTooltip = GUI.tooltip;
   }


   // Mouse click event on map area
   if (e.type == EventType.MouseDown && e.isMouse)
   {
      if (panelVisible && Input.mousePosition.x > panelWidth && GUIControl.cursorObject)
      {
         var c : DefendGUICursorControl = GUIControl.cursorObject.GetComponent(DefendGUICursorControl);
         // Check player can afford, and legal placement
         if (e.button == 0 && GameData.player.credits >= (-costValue) && c.legalLocation)
         {
            c.mode += 1; // place, rotate.
            if (c.mode == 2)
            {
               // Deduct cost
               GameData.player.credits += costValue;

               // Place tower in scene
               if (Network.isServer || GameData.hostType == 0)
                  CreateTower(selectedTypeButton+1, GUIControl.cursorObject.transform.position, GUIControl.cursorObject.transform.rotation,
                  selectedRange, selectedFOV, selectedRate, selectedDamage,
                  selectedColor.r, selectedColor.g, selectedColor.b);
               else
                  netView.RPC("CreateTower", RPCMode.Server, selectedTypeButton+1, GUIControl.cursorObject.transform.position, GUIControl.cursorObject.transform.rotation,
                  selectedRange, selectedFOV, selectedRate, selectedDamage,
                  selectedColor.r, selectedColor.g, selectedColor.b);

               //var prefabName : String = Tower.PrefabName(selectedTypeButton+1);
               //var newTower : GameObject = Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation);
               //var newTower : GameObject = Network.Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation, 0);
               //newTower.SendMessage("Init");

               GUIControl.DestroyCursor();
               GameData.player.selectedTower = null;
               selectedTypeButton = -1;
            }
         }
         else if (e.button == 1) // RMB undo placement
         {
            // Reset placement mode
            if (c.mode==0)
            {
               GUIControl.DestroyCursor();
               GameData.player.selectedTower = null;
               selectedTypeButton = -1;
            }
            else
               c.mode = 0;
         }
      }
      else // no cursorObject
      {
         // RMB de-selects
         if (e.button == 1)
         {
            GameData.player.selectedTower = null;
            selectedTypeButton = -1;
         }
      }
   }
}
