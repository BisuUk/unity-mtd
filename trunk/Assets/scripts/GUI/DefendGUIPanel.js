#pragma strict
#pragma downcast

import CustomWidgets;

var tower : Tower;
var colorCircle : Texture2D;
var previewItemPos : Transform;
var textStyle : GUIStyle;
var netView : NetworkView;

static var selectedColor : Color = Color.black;
static var selectedRange  : float;
static var selectedRate  : float;
static var selectedFOV  : float;
static var selectedDamage  : float;
static var selectedBehavior : int;
static var panelWidth : int = 200;
static var panelHeight = Screen.height;

private var previewItem : GameObject;
private var costValue : int = 0;
private var timeValue : float = 0;
private var modifingExisting : boolean = false;
//private var squadCountStrings : String[] = ["5-", "-", "+", "5+"];
private var behaviourStrings : String[] = ["Weak", "Close", "Best"];
private var lastSelTower : Tower = null;
private var cursorTower : Tower = null;
private var recalcCosts : boolean = false;
private var lastTooltip : String = "";

function Awake()
{
   panelWidth = Screen.width*0.20;
}

function SetTower(newTower : Tower)
{
   enabled = true;
   modifingExisting = true;
   NewPreviewItem(1);
}

function SetNew(unitType : int)
{
   enabled = true;
   modifingExisting = false;
   NewPreviewItem(1);
}

function OnGUI()
{
   panelWidth = Screen.width*0.20;
   panelHeight = Screen.height*0.80;
   var previewHeight : float = Screen.height-panelHeight;
   var e : Event = Event.current;
   var panelVisible : boolean = false;
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

   // 3D Camera
   GUIControl.previewCamera.camera.enabled = true;
   GUIControl.previewCamera.camera.pixelRect = Rect(0, panelHeight, panelWidth, previewHeight);

   var panelRect : Rect = Rect(0, previewHeight, panelWidth, panelHeight);
   GUI.Box(panelRect,"");

   GUILayout.BeginArea(panelRect);

      GUILayout.BeginVertical();

         GUILayout.Space(15);

         // Range slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Range", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space (5);
            var newlySelectedRange : float = GUILayout.HorizontalSlider(selectedRange, towerAttr.minRange, towerAttr.maxRange, GUILayout.ExpandWidth(true));
            GUILayout.Space (5);
            if (selectedRange != newlySelectedRange)
            {
               selectedRange = newlySelectedRange;
               recalcCosts = true;
               // Set cursor range, or set the selected towers temp range
               if (cursorTower)
                  cursorTower.SetRange(selectedRange);
               else
                  selTower.SetTempRange(selectedRange);
            }
         GUILayout.EndHorizontal();

         // FOV
         selectedFOV = towerAttr.defaultFOV;

         // Rate of fire slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Rate", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedRate : float = GUILayout.HorizontalSlider(selectedRate, towerAttr.minFireRate, towerAttr.maxFireRate, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedRate != newlySelectedRate)
            {
               selectedRate = newlySelectedRate;
               recalcCosts = true;
               if (cursorTower)
                  cursorTower.fireRate = selectedRate;
               else
                  selTower.SetTempRate(selectedRate);

            }
         GUILayout.EndHorizontal();

         // Damage slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Dmg", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedDamage : float = GUILayout.HorizontalSlider(selectedDamage, towerAttr.minDamage, towerAttr.maxDamage, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedDamage != newlySelectedDamage)
            {
               selectedDamage = newlySelectedDamage;
               recalcCosts = true;
               if (cursorTower)
                  cursorTower.damage = selectedDamage;
               else
                  selTower.SetTempDamage(selectedDamage);
            }
         GUILayout.EndHorizontal();

         // Behavior selection grid
         var newlySelectedBehavior : int = GUILayout.SelectionGrid(selectedBehavior, behaviourStrings, 3);
         if (newlySelectedBehavior != selectedBehavior)
         {
            // just send over wire?
            selectedBehavior = newlySelectedBehavior;
         }
   
         // Color Wheel
         var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
         if (newlySelectedColor != selectedColor)
         {
            selectedColor = newlySelectedColor;
            recalcCosts = true;
            // Set cursor range, or set the selected towers temp range
            if (cursorTower)
               cursorTower.SetColor(selectedColor);
            else
               selTower.SetTempColor(selectedColor);
         }

         GUILayout.FlexibleSpace(); // push everything down

         // Cost
         if (costValue != 0)
         {
            // Credits
            textStyle.normal.textColor = ((-costValue) > GameData.player.credits) ? Color.red : Color(0.2,1.0,0.2);
            textStyle.fontSize = 30;
            GUILayout.Label((costValue<0 ? (-costValue).ToString() : "+"+costValue.ToString()), textStyle);

            // Time
            textStyle.normal.textColor = Color.white;
            textStyle.fontSize = 20;
            GUILayout.Label(timeValue.ToString("#.0")+"sec", textStyle);
         }

         GUILayout.BeginHorizontal();
         // Actions
         if (GameData.player.selectedTower)
         {
            // Sell button
            if (GUILayout.Button(GUIContent("Sell", "SellButton")))
            {
               GameData.player.credits += selTower.GetCurrentCost();
               GameData.player.credits += selTower. GetColorDeltaCost(Color.white, selTower.color);
               if (GameData.hostType>0)
                  Network.Destroy(GameData.player.selectedTower);
               else
                  Destroy(GameData.player.selectedTower);
               GameData.player.selectedTower = null;
            }

            // Apply button
            if (GUILayout.Button(GUIContent("Apply", "ApplyButton")))
            {
               if (costValue != 0 && (-costValue) < GameData.player.credits && lastTooltip != "SellButton" && selTower.isConstructing==false)
               {
                  GameData.player.credits += costValue;
                  costValue = 0;
                  if (Network.isServer || (GameData.hostType==0))
                     selTower.Modify(
                        selectedRange, selectedFOV, selectedRate, selectedDamage,
                        selectedColor.r, selectedColor.g, selectedColor.b);
                  else
                     selTower.netView.RPC("Modify", RPCMode.Server,
                        selectedRange, selectedFOV, selectedRate, selectedDamage,
                        selectedColor.r, selectedColor.g, selectedColor.b);
               }
            }
         }
         GUILayout.EndHorizontal();

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
                  CreateTower(tower.type, GUIControl.cursorObject.transform.position, GUIControl.cursorObject.transform.rotation,
                  selectedRange, selectedFOV, selectedRate, selectedDamage,
                  selectedColor.r, selectedColor.g, selectedColor.b);
               else
                  netView.RPC("CreateTower", RPCMode.Server, tower.type, GUIControl.cursorObject.transform.position, GUIControl.cursorObject.transform.rotation,
                  selectedRange, selectedFOV, selectedRate, selectedDamage,
                  selectedColor.r, selectedColor.g, selectedColor.b);

               //var prefabName : String = Tower.PrefabName(selectedTypeButton+1);
               //var newTower : GameObject = Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation);
               //var newTower : GameObject = Network.Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation, 0);
               //newTower.SendMessage("Init");

               GUIControl.DestroyCursor();
               GameData.player.selectedTower = null;
            }
         }
         else if (e.button == 1) // RMB undo placement
         {
            // Reset placement mode
            if (c.mode==0)
            {
               GUIControl.DestroyCursor();
               GameData.player.selectedTower = null;
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
         }
      }
   }
}

function OnEnable()
{
   GUIControl.previewCamera.camera.enabled = true;
}

function OnDisable()
{
   GUIControl.previewCamera.camera.enabled = false;
   DestroyPreviewItem();
}

function DestroyPreviewItem()
{
   if (previewItem)
   {
      for (var child : Transform in previewItem.transform)
         Destroy(child.gameObject);
      Destroy(previewItem);
   }
}

function NewPreviewItem(type : int)
{
   //Debug.Log("NewPreviewItem: type="+type);
   DestroyPreviewItem();

   if (type>0)
   {
      var prefabName : String = TowerUtil.PrefabName(type);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.name = "DefendGUIPreviewItem";
      previewItem.layer = 8; // 3D GUI layer
      for (var child : Transform in previewItem.transform)
         child.gameObject.layer = 8; // 3D GUI layer

      previewItem.GetComponent(Collider).enabled = false;   //remove collider
      Destroy(previewItem.GetComponent(Tower).AOE.gameObject); //remove AOE
      previewItem.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior

      previewItem.AddComponent(DefendGUIPreviewItem);

   }
}

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
