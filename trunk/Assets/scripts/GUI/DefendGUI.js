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
static var pulsateScale : float = 0.0;
static var pulsateDuration : float = 0.25;

private var idGenerator : int;
private var cursorObject : GameObject;
private var previewItem : GameObject;
private var towerTypeStrings : String[] = ["Pulse", "Proj", "Amp"];
private var behaviourStrings : String[] = ["Weak", "Close", "Best"];
private var selectedTypeButton : int = -1;
private var lastSelTower : Tower = null;
private var cursorTower : Tower = null;
private var lastTooltip : String = " ";

function Start()
{
   // Create a ground plane for mouse interactions
   var groundPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
   groundPlane.transform.position = Vector3(0,0,0);
   groundPlane.transform.localScale = Vector3(100,100,100);
   groundPlane.renderer.enabled = false;
   groundPlane.layer = 9; // GUI layer
   groundPlane.name = "GroundPlane";

   // Show preview camera
   previewCamera.camera.enabled = true;
}


@RPC
function CreateTower(towerType : int, pos : Vector3, rot : Quaternion,
                     range : float, fov : float, rate : float, damage : float,
                     colorRed : float, colorGreen : float, colorBlue : float)
{
   var prefabName : String = TowerUtil.PrefabName(towerType);
   var newTower : GameObject = Network.Instantiate(Resources.Load(prefabName, GameObject), pos, rot, 0);
   var t : Tower = newTower.GetComponent(Tower);

   t.Initialize(range, fov, rate, damage, Color(colorRed, colorGreen, colorBlue));
}


function OnGUI()
{
   var panelHeight = Screen.height;
   var panelWidth = Screen.width*0.20;
   var e : Event = Event.current;
   var panelVisible : boolean = false;
   var panelRect : Rect = Rect(0, 0, panelWidth, panelHeight);
   var costValue : int = 0;
   var timeValue : float = 0;
   var textStyle : GUIStyle = new GUIStyle();
   var towerAttr : TowerAttributes;
   var selTower : Tower = null;
   var curTower : Tower = null;

   // Font style
   textStyle.fontStyle = FontStyle.Bold;
   textStyle.alignment = TextAnchor.MiddleCenter;

   if (GameData.player.selectedTower)
   {
      panelVisible = true;
      selTower = GameData.player.selectedTower.GetComponent(Tower);
      // A fielded tower is selected

      towerAttr = selTower.base;
      if (selTower != lastSelTower)
      {
         selectedRange = selTower.range;
         selectedRate = selTower.fireRate;
         selectedDamage = selTower.damage;
         selectedColor = selTower.color;
         lastSelTower = selTower;
      }
      else // Changing a fielded tower's attributes
      {
         costValue = selTower.GetCurrentCost();
         timeValue = selTower.GetCurrentTimeCost();
         var possibleCostValue = selTower.GetCost(selectedRange, selectedRate, selectedDamage);
         var possibleTimeCostValue = selTower.GetTimeCost(selectedRange, selectedRate, selectedDamage);

         costValue = Mathf.Abs(costValue - possibleCostValue);
         timeValue = Mathf.FloorToInt(Mathf.Abs(timeValue - possibleTimeCostValue));
      }

      NewCursor(0);
   }
   else if (cursorObject) // New tower being built
   {
      panelVisible = true;
      // Placing a new tower
      curTower = cursorObject.GetComponent(Tower);
      towerAttr = curTower.base;
      selectedRange = curTower.range;
      selectedRate = curTower.fireRate;
      selectedDamage = curTower.damage;
      costValue = curTower.GetCost(selectedRange, selectedRate, selectedDamage);
      timeValue = curTower.GetTimeCost(selectedRange, selectedRate, selectedDamage);
   }
   else  // Nothing selected
   {
      panelVisible = false;
      lastSelTower = null;
   }


   if (panelVisible)
   {
      GUI.Box(panelRect,"");

      // 3D Camera
      previewCamera.camera.enabled = true;
      previewCamera.camera.pixelRect = Rect(10, panelHeight-(panelHeight*0.20)-10, panelWidth*0.90, panelHeight*0.20);

      GUILayout.BeginArea(panelRect);
         GUILayout.Space(panelHeight*0.20);
         GUILayout.BeginVertical();
         GUILayout.FlexibleSpace(); // push everything down
         GUILayout.Space(15);

         // Range slider
         GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
            GUILayout.Label("Range", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space (5);
            var newlySelectedRange : float = GUILayout.HorizontalSlider(selectedRange, towerAttr.minRange, towerAttr.maxRange, GUILayout.ExpandWidth(true));
            GUILayout.Space (5);
            if (selectedRange != newlySelectedRange)
            {
               selectedRange = newlySelectedRange;
               if (cursorTower)
                  cursorTower.SetRange(selectedRange);
            }
         GUILayout.EndHorizontal();

         // FOV
         selectedFOV = towerAttr.defaultFOV;

         // Rate of fire slider
         GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
            GUILayout.Label("Rate", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedRate : float = GUILayout.HorizontalSlider(selectedRate, towerAttr.minFireRate, towerAttr.maxFireRate, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedRate != newlySelectedRate)
            {
               selectedRate = newlySelectedRate;
               if (cursorTower)
                  cursorTower.fireRate = selectedRate;
            }
         GUILayout.EndHorizontal();

         // Damage slider
         GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
            GUILayout.Label("Dmg", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedDamage : float = GUILayout.HorizontalSlider(selectedDamage, towerAttr.minDamage, towerAttr.maxDamage, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedDamage != newlySelectedDamage)
            {
               selectedDamage = newlySelectedDamage;
               if (cursorTower)
                  cursorTower.damage = selectedDamage;
            }
         GUILayout.EndHorizontal();


         // Behavior selection grid
         var newlySelectedBehavior : int = GUILayout.SelectionGrid(selectedBehavior, behaviourStrings, 3);
         if (newlySelectedBehavior != selectedBehavior)
            selectedBehavior = newlySelectedBehavior;
   
         // Color Wheel slider
         GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
            var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
            if (newlySelectedColor != selectedColor)
            {
               selectedColor = newlySelectedColor;
               if (cursorTower)
                  cursorTower.SetColor(selectedColor);
            }
         GUILayout.EndHorizontal();
   
         GUILayout.FlexibleSpace(); // push everything down
   
         // Cost
         if (costValue != 0)
         {
            GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
               textStyle.normal.textColor = (costValue > GameData.player.credits) ? Color.red : Color(0.2,1.0,0.2);
               textStyle.fontSize = 30;
               GUILayout.Label(GUIContent(costValue.ToString(), "Cost"), textStyle);
            GUILayout.EndHorizontal();

            // Time
            GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
               textStyle.normal.textColor = Color.white;
               textStyle.fontSize = 20;
               GUILayout.Label(GUIContent(timeValue.ToString("#.0")+"sec", "Time"), textStyle);
            GUILayout.EndHorizontal();
         }

         // Actions
         if (GameData.player.selectedTower)
         {
            GUILayout.BeginHorizontal(GUILayout.Width(panelWidth-4));
               if (GUILayout.Button(GUIContent("Sell", "SellButton")))
               {
                  GameData.player.credits += selTower.GetCurrentCost();
                  Network.Destroy(GameData.player.selectedTower);
                  GameData.player.selectedTower = null;
               }
               GUILayout.Space(5);
               if (costValue != 0 && costValue <= GameData.player.credits && selTower.isConstructing==false)
               {
                  if (GUILayout.Button(GUIContent("Apply", "ApplyButton")))
                  {
                     GameData.player.credits -= costValue;
                     if (Network.isServer)
                        selTower.Modify(
                           selectedRange, selectedFOV, selectedRate, selectedDamage,
                           selectedColor.r, selectedColor.g, selectedColor.b);
                     else
                        selTower.netView.RPC("Modify", RPCMode.Server,
                           selectedRange, selectedFOV, selectedRate, selectedDamage,
                           selectedColor.r, selectedColor.g, selectedColor.b);
                  }
               }
            GUILayout.EndHorizontal();
         }
   
         // mouse over test
         //if (Event.current.type == EventType.Repaint && GUI.tooltip != lastTooltip) {
         //    if (lastTooltip != "")
         //        SendMessage (lastTooltip + "OnMouseOut", SendMessageOptions.DontRequireReceiver);
         //    if (GUI.tooltip != "")
         //        SendMessage (GUI.tooltip + "OnMouseOver", SendMessageOptions.DontRequireReceiver);
         //    lastTooltip = GUI.tooltip;
         //}

         GUILayout.EndVertical();
      GUILayout.EndArea();
   }
   else
   {
      previewCamera.camera.enabled = false;
   }

   GUILayout.BeginArea(Rect(panelWidth+100, Screen.height-200, Screen.width, 200));
      GUILayout.BeginVertical(GUILayout.Width(panelWidth-4), GUILayout.Height(200));

         GUILayout.FlexibleSpace(); // push everything down

         textStyle.normal.textColor = Color(0.2,1.0,0.2);
         textStyle.fontSize = 30;
         GUILayout.Label(GUIContent(GameData.player.credits.ToString(), "Credits"), textStyle);

         var newTowerTypeButton : int = GUILayout.SelectionGrid(selectedTypeButton, towerTypeStrings, 3, GUILayout.MinHeight(50));
         if (newTowerTypeButton != selectedTypeButton)
         {
            GameData.player.selectedTower = null;
            selectedTypeButton = newTowerTypeButton;
            selectedDamage = 1.0;
            selectedRate = 1.0;
            selectedColor = Color.white;
            selectedRange = 1.0;

            NewCursor(selectedTypeButton+1);
            NewPreviewItem(selectedTypeButton+1);
         }
      GUILayout.EndVertical();
   GUILayout.EndArea();


   // Mouse click event on map area
   if (e.type == EventType.MouseDown && e.isMouse)
   {
      if (panelVisible && Input.mousePosition.x > panelWidth && cursorObject)
      {
         var c : DefendGUICursorControl = cursorObject.GetComponent(DefendGUICursorControl);
         // Check player can afford, and legal placement
         if (e.button == 0 && GameData.player.credits >= costValue && c.legalLocation)
         {
            c.mode += 1; // place, rotate.
            if (c.mode == 2)
            {
               // Deduct cost
               GameData.player.credits -= costValue;

               // Place tower in scene
               if (Network.isServer)
                  CreateTower(selectedTypeButton+1, cursorObject.transform.position, cursorObject.transform.rotation,
                  selectedRange, selectedFOV, selectedRate, selectedDamage,
                  selectedColor.r, selectedColor.g, selectedColor.b);
               else
                  netView.RPC("CreateTower", RPCMode.Server, selectedTypeButton+1, cursorObject.transform.position, cursorObject.transform.rotation,
                  selectedRange, selectedFOV, selectedRate, selectedDamage,
                  selectedColor.r, selectedColor.g, selectedColor.b);

               //var prefabName : String = Tower.PrefabName(selectedTypeButton+1);
               //var newTower : GameObject = Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation);
               //var newTower : GameObject = Network.Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation, 0);
               //newTower.SendMessage("Init");

               NewCursor(selectedTypeButton+1);

            }
         }
         else if (e.button == 1) // RMB undo placement
         {
            // Reset placement mode
            if (c.mode==0)
            {
               NewCursor(0);
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


function NewPreviewItem(type : int)
{
   //Debug.Log("NewPreviewItem: type="+type);
   if (previewItem)
   {
      for (var child : Transform in previewItem.transform)
         Destroy(child.gameObject);
      Destroy(previewItem);
   }
   if (type>0)
   {
      var prefabName : String = TowerUtil.PrefabName(type);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
      previewItem.layer = 8; // 3D GUI layer
      previewItem.name = "DefendGUIPreviewItem";
      previewItem.GetComponent(Collider).enabled = false;
      Destroy(previewItem.GetComponent(Tower).AOE.gameObject);
      previewItem.AddComponent(DefendGUIPreviewItem);
      for (var child : Transform in previewItem.transform)
         child.gameObject.layer = 8; // 3D GUI layer
   }
}


function NewCursor(type : int)
{
   //Debug.Log("NewCursor: type="+type);
   if (cursorObject)
   {
      cursorTower = null;
      for (var child : Transform in cursorObject.transform)
         Destroy(child.gameObject);
      Destroy(cursorObject);

   }
   if (type>0)
   {
      var prefabName : String = TowerUtil.PrefabName(type);
      cursorObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.name = "DefendGUICursor";
      cursorObject.AddComponent(DefendGUICursorControl);
      cursorObject.GetComponent(Collider).enabled = false;
      cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
      cursorTower = cursorObject.GetComponent(Tower);
   }
}

function DoPulsate()
{
   var t : float = Mathf.PingPong(Time.time, pulsateDuration) / pulsateDuration;
   pulsateScale = Mathf.Lerp(0.0, 0.1, t);
}