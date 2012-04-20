#pragma strict
#pragma downcast

import CustomWidgets;

var tower : Tower;
var towerBase : TowerAttributes;
var colorCircle : Texture2D;
var previewItemPos : Transform;
var textStyle : GUIStyle;
var netView : NetworkView;

static var selectedColor : Color = Color.black;
static var selectedRange  : float;
static var selectedFireRate  : float;
static var selectedFOV  : float;
static var selectedStrength : float;
static var selectedEffect : int;
static var selectedBehavior : int;
static var panelWidth : int = 200;
static var panelHeight = Screen.height;

private var previewItem : GameObject;
private var costValue : int = 0;
private var timeValue : float = 0;
private var modifyingExisting : boolean = false;
private var behaviourStrings : String[] = ["Weak", "Close", "Best"];
private var effectStrings : String[] = ["Dmg", "Slow", "Color"];
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
   modifyingExisting = true;
   tower = newTower;
   towerBase = tower.gameObject.GetComponent(TowerAttributes);
   NewPreviewItem(tower.type);

   selectedRange = towerBase.AdjustRange(tower.range, true);
   selectedFOV = towerBase.AdjustFOV(tower.fov, true);
   selectedEffect = tower.effect;
   selectedFireRate = towerBase.AdjustFireRate(tower.fireRate, true);
   selectedStrength = towerBase.AdjustStrength(tower.strength, true);
   selectedColor = tower.color;
   selectedBehavior = tower.targetingBehavior;
   recalcCosts = true;
}

function SetNew(type : int)
{
   enabled = true;
   modifyingExisting = false;
   GUIControl.NewCursor(2, type);
   tower = GUIControl.cursorObject.GetComponent(Tower);
   towerBase = GUIControl.cursorObject.GetComponent(TowerAttributes);
   tower.SetColor(Color.white);
   NewPreviewItem(type);

   selectedRange = towerBase.AdjustRange(towerBase.defaultRange, true);
   selectedFOV = towerBase.AdjustFOV(towerBase.defaultFOV, true);
   selectedEffect = towerBase.defaultEffect;
   selectedFireRate = towerBase.AdjustFireRate(towerBase.defaultFireRate, true);
   selectedStrength = towerBase.AdjustStrength(towerBase.defaultStrength, true);
   selectedColor = Color.white;
   selectedBehavior = towerBase.defaultTargetBehavior;
   recalcCosts = true;
}

function OnGUI()
{
   panelWidth = Screen.width*0.20;
   panelHeight = Screen.height*0.80;
   var previewHeight : float = Screen.height-panelHeight;
   var e : Event = Event.current;

   // Font style
   textStyle.fontStyle = FontStyle.Bold;
   textStyle.alignment = TextAnchor.MiddleCenter;

   if (recalcCosts)
   {
      if (modifyingExisting)
      {
         costValue = tower.GetCurrentCost();
         timeValue = tower.GetCurrentTimeCost();

         // Changing a fielded tower's attributes, compare diff
         var possibleCostValue : int = tower.GetCost(selectedRange, selectedFOV, selectedFireRate, selectedStrength, selectedEffect);
         var possibleTimeCostValue : float = tower.GetTimeCost(selectedRange, selectedFOV, selectedFireRate, selectedStrength, selectedEffect);

         costValue = Mathf.FloorToInt(possibleCostValue - costValue);
         timeValue = Mathf.Abs(timeValue - possibleTimeCostValue);

         costValue += tower.GetColorDeltaCost(tower.color, selectedColor);
         timeValue += tower.GetColorDeltaTimeCost(tower.color, selectedColor);
      }
      else
      {
         costValue = tower.GetCurrentCost();
         costValue += tower.GetColorDeltaCost(tower.color, Color.white);
         timeValue = tower.GetCurrentTimeCost();
         timeValue += tower.GetColorDeltaTimeCost(tower.color, Color.white);
      }

      recalcCosts = false;
   }

   // 3D Camera
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
            var newlySelectedRange : float = GUILayout.HorizontalSlider(selectedRange, 0.0, 1.0, GUILayout.ExpandWidth(true));
            GUILayout.Space (5);
            if (selectedRange != newlySelectedRange)
            {
               selectedRange = newlySelectedRange;
               recalcCosts = true;
               // Set cursor range, or set the selected towers temp range
               if (modifyingExisting)
                  tower.SetTempRange(towerBase.AdjustRange(selectedRange, false));
               else
                  tower.SetRange(towerBase.AdjustRange(selectedRange, false));
            }
         GUILayout.EndHorizontal();

         // FOV slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("FOV", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedFOV : float = GUILayout.HorizontalSlider(selectedFOV, 0.0, 1.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedFOV != newlySelectedFOV)
            {
               selectedFOV = newlySelectedFOV;
               recalcCosts = true;
               if (modifyingExisting)
                  tower.SetTempFOV(towerBase.AdjustFOV(selectedFOV, false));
               else
                  tower.SetFOV(towerBase.AdjustFOV(selectedFOV, false));
            }
         GUILayout.EndHorizontal();

         // Rate of fire slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Rate", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedFireRate : float = GUILayout.HorizontalSlider(selectedFireRate, 0.0, 1.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedFireRate != newlySelectedFireRate)
            {
               selectedFireRate = newlySelectedFireRate;
               recalcCosts = true;
               if (modifyingExisting)
                  tower.SetTempFireRate(towerBase.AdjustFireRate(selectedFireRate, false));
               else
                  tower.fireRate = towerBase.AdjustFireRate(selectedFireRate, false);
            }
         GUILayout.EndHorizontal();

         // Damage slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Str", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedStrength: float = GUILayout.HorizontalSlider(selectedStrength, 0.0, 1.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedStrength != newlySelectedStrength)
            {
               selectedStrength = newlySelectedStrength;
               recalcCosts = true;
               if (modifyingExisting)
                  tower.SetTempStrength(towerBase.AdjustStrength(selectedStrength, false));
               else
                  tower.strength = towerBase.AdjustStrength(selectedStrength, false);
            }
         GUILayout.EndHorizontal();

         // Effect selection grid
         textStyle.normal.textColor = Color.white;
         textStyle.fontSize = 15;
         GUILayout.Label("Effect", textStyle);
         var newlySelectedEffect : int = GUILayout.SelectionGrid(selectedEffect, effectStrings, 3);
         if (newlySelectedEffect != selectedEffect)
         {
            // just send over wire?
            selectedEffect = newlySelectedEffect;
            recalcCosts = true;
            if (modifyingExisting)
               tower.SetTempEffect(selectedEffect);
            else
               tower.effect = selectedEffect;
         }

         // Color Wheel
         var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
         if (newlySelectedColor != selectedColor)
         {
            selectedColor = newlySelectedColor;
            recalcCosts = true;
            // Set cursor range, or set the selected towers temp range
            if (modifyingExisting)
               tower.SetTempColor(selectedColor);
            else
               tower.SetColor(selectedColor);
         }

         // Behavior selection grid
         textStyle.normal.textColor = Color.white;
         textStyle.fontSize = 15;
         GUILayout.Label("Target", textStyle);
         var newlySelectedBehavior : int = GUILayout.SelectionGrid(selectedBehavior, behaviourStrings, 3);
         if (newlySelectedBehavior != selectedBehavior)
         {
            // just send over wire?
            selectedBehavior = newlySelectedBehavior;
         }

         GUILayout.FlexibleSpace(); // push everything down

         // Cost
         if (costValue != 0)
         {
            // Credits
            textStyle.normal.textColor = (costValue > GameData.player.credits) ? Color.red : Color(0.2,1.0,0.2);
            textStyle.fontSize = 30;
            GUILayout.Label((costValue>0) ? costValue.ToString() : "+"+(-costValue).ToString(), textStyle);

            // Time
            textStyle.normal.textColor = Color.white;
            textStyle.fontSize = 20;
            GUILayout.Label(timeValue.ToString("#.0")+"sec", textStyle);
         }

         GUILayout.BeginHorizontal();
         // Actions
         if (modifyingExisting)
         {
            // Sell button
            if (GUILayout.Button(GUIContent("Sell", "SellButton")))
            {
               GameData.player.credits += tower.GetCurrentCost();
               GameData.player.credits += tower.GetColorDeltaCost(Color.white, tower.color);
               if (GameData.hostType>0)
                  Network.Destroy(GameData.player.selectedTower);
               else
                  Destroy(GameData.player.selectedTower);
               GameData.player.selectedTower = null;
               enabled = false;
            }

            // Apply button
            if (GUILayout.Button(GUIContent("Apply", "ApplyButton")))
            {
               if (costValue < GameData.player.credits && lastTooltip != "SellButton" && tower.isConstructing==false)
               {
                  GameData.player.credits -= costValue;
                  costValue = 0;
                  if (Network.isServer || (GameData.hostType==0))
                     tower.Modify(
                        towerBase.AdjustRange(selectedRange, false),
                        towerBase.AdjustFOV(selectedFOV, false),
                        towerBase.AdjustFireRate(selectedFireRate, false),
                        towerBase.AdjustStrength(selectedStrength, false),
                        selectedEffect,
                        selectedColor.r, selectedColor.g, selectedColor.b,
                        selectedBehavior);
                  else
                     tower.netView.RPC("Modify", RPCMode.Server,
                        towerBase.AdjustRange(selectedRange, false),
                        towerBase.AdjustFOV(selectedFOV, false),
                        towerBase.AdjustFireRate(selectedFireRate, false),
                        towerBase.AdjustStrength(selectedStrength, false),
                        selectedEffect,
                        selectedColor.r, selectedColor.g, selectedColor.b,
                        selectedBehavior);
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
         costValue = tower.GetCurrentCost();
         costValue += tower.GetColorDeltaCost(Color.white, selectedColor);
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
      if (Input.mousePosition.x > panelWidth && GUIControl.cursorObject)
      {
         var c : DefendGUICursorControl = GUIControl.cursorObject.GetComponent(DefendGUICursorControl);
         // Check player can afford, and legal placement
         if (e.button == 0 && GameData.player.credits >= (-costValue) && c.legalLocation)
         {
            c.SetMode(c.mode+1);; // place, rotate.
            if (c.mode == 2)
            {
               // Deduct cost
               GameData.player.credits -= costValue;

               // Place tower in scene
               if (Network.isServer || GameData.hostType == 0)
                  CreateTower(tower.type, GUIControl.cursorObject.transform.position, GUIControl.cursorObject.transform.rotation,
                     towerBase.AdjustRange(selectedRange, false),
                     towerBase.AdjustFOV(selectedFOV, false),
                     towerBase.AdjustFireRate(selectedFireRate, false),
                     towerBase.AdjustStrength(selectedStrength, false),
                     selectedEffect,
                     selectedColor.r, selectedColor.g, selectedColor.b,
                     selectedBehavior);
               else
                  netView.RPC("CreateTower", RPCMode.Server, tower.type, GUIControl.cursorObject.transform.position, GUIControl.cursorObject.transform.rotation,
                  towerBase.AdjustRange(selectedRange, false),
                  towerBase.AdjustFOV(selectedFOV, false),
                  towerBase.AdjustFireRate(selectedFireRate, false),
                  towerBase.AdjustStrength(selectedStrength, false),
                  selectedEffect,
                  selectedColor.r, selectedColor.g, selectedColor.b,
                  selectedBehavior);

               GUIControl.DestroyCursor();
               GameData.player.selectedTower = null;
               enabled = false;
            }
         }
         else if (e.button == 1) // RMB undo placement
         {
            // Reset placement mode
            if (c.mode==0)
            {
               GUIControl.DestroyCursor();
               GameData.player.selectedTower = null;
               enabled = false;
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
            enabled = false;
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
                     range : float, fov : float, rate : float, strength : float, effect : int,
                     colorRed : float, colorGreen : float, colorBlue : float, newBehaviour : int)
{
   var prefabName : String = TowerUtil.PrefabName(towerType);
   var newTower : GameObject;

   if (GameData.hostType > 0)
      newTower = Network.Instantiate(Resources.Load(prefabName, GameObject), pos, rot, 0);
   else
      newTower = Instantiate(Resources.Load(prefabName, GameObject), pos, rot);
   var t : Tower = newTower.GetComponent(Tower);

   t.Initialize(range, fov, rate, strength, effect, Color(colorRed, colorGreen, colorBlue), newBehaviour);
}
