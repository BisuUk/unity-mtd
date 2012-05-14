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

   selectedRange = tower.AdjustRange(tower.range, true);
   selectedFOV = tower.AdjustFOV(tower.fov, true);
   selectedEffect = tower.effect;
   selectedFireRate = tower.AdjustFireRate(tower.fireRate, true);
   selectedStrength = tower.AdjustStrength(tower.strength, true);
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

   selectedRange = tower.AdjustRange(towerBase.defaultRange, true);
   selectedFOV = tower.AdjustFOV(towerBase.defaultFOV, true);
   selectedEffect = towerBase.defaultEffect;
   selectedFireRate = tower.AdjustFireRate(towerBase.defaultFireRate, true);
   selectedStrength = tower.AdjustStrength(towerBase.defaultStrength, true);
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
      var colorDiff : float;
      if (modifyingExisting)
      {
         costValue = tower.Cost();
         timeValue = tower.TimeCost();

         // Changing a fielded tower's attributes, compare diff
         var possibleCostValue : int = tower.costs.Cost(selectedRange, selectedFOV, selectedFireRate, selectedStrength, selectedEffect);
         var possibleTimeCostValue : float = tower.costs.TimeCost(selectedRange, selectedFOV, selectedFireRate, selectedStrength, selectedEffect);

         costValue = Mathf.FloorToInt(possibleCostValue - costValue);
         timeValue = Mathf.Abs(timeValue - possibleTimeCostValue);

         //costValue += tower.costs.ColorDiffCost(tower.color, selectedColor);
         //timeValue += tower.costs.ColorDiffTimeCost(tower.color, selectedColor);
         colorDiff = (1.0-Utility.ColorMatch(tower.color, selectedColor));
         costValue += (possibleCostValue/2) * colorDiff;
         timeValue += (possibleTimeCostValue/2) * colorDiff;
      }
      else
      {
         colorDiff = (1.0-Utility.ColorMatch(tower.color, Color.white));
         costValue = tower.Cost();
         //costValue += tower.costs.ColorDiffCost(tower.color, Color.white);
         costValue += (costValue/2) * colorDiff;

         timeValue = tower.TimeCost();
         //timeValue += tower.costs.ColorDiffTimeCost(tower.color, Color.white);
         timeValue += (timeValue/2) * colorDiff;
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
                  tower.SetTempRange(tower.AdjustRange(selectedRange, false));
               else
                  tower.SetRange(tower.AdjustRange(selectedRange, false));
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
                  tower.SetTempFOV(tower.AdjustFOV(selectedFOV, false));
               else
                  tower.SetFOV(tower.AdjustFOV(selectedFOV, false));
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
                  tower.SetTempFireRate(tower.AdjustFireRate(selectedFireRate, false));
               else
                  tower.fireRate = tower.AdjustFireRate(selectedFireRate, false);
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
                  tower.SetTempStrength(tower.AdjustStrength(selectedStrength, false));
               else
                  tower.strength = tower.AdjustStrength(selectedStrength, false);
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
            textStyle.normal.textColor = (costValue > Game.player.credits) ? Color.red : Color(0.2,1.0,0.2);
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
               Game.player.credits += tower.Cost();
               //Game.player.credits += tower.costs.ColorDiffCost(Color.white, tower.color);


               if (Game.hostType>0)
                  Network.Destroy(Game.player.selectedTower);
               else
                  Destroy(Game.player.selectedTower);
               Game.player.selectedTower = null;
               enabled = false;
            }

            // Apply button
            if (GUILayout.Button(GUIContent("Apply", "ApplyButton")))
            {
               // NOTE: Client is calculating affordability, unsecure.
               if (costValue <= Game.player.credits && lastTooltip != "SellButton" && tower.isConstructing==false)
               {
                  Game.player.credits -= costValue;
                  costValue = 0;
                  if (Network.isServer || (Game.hostType==0))
                     tower.Modify(
                        tower.AdjustRange(selectedRange, false),
                        tower.AdjustFOV(selectedFOV, false),
                        tower.AdjustFireRate(selectedFireRate, false),
                        tower.AdjustStrength(selectedStrength, false),
                        selectedEffect,
                        selectedColor.r, selectedColor.g, selectedColor.b,
                        selectedBehavior);
                  else
                     tower.netView.RPC("Modify", RPCMode.Server,
                        tower.AdjustRange(selectedRange, false),
                        tower.AdjustFOV(selectedFOV, false),
                        tower.AdjustFireRate(selectedFireRate, false),
                        tower.AdjustStrength(selectedStrength, false),
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
         costValue = tower.Cost();
         //costValue += tower.costs.ColorDiffCost(Color.white, selectedColor);
         costValue *= -1;
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
      if (Input.mousePosition.x > panelWidth && GUIControl.cursorObject)
      {
         var c : DefendGUICursor = GUIControl.cursorObject.GetComponent(DefendGUICursor);
         // Check player can afford, and legal placement
         if (e.button == 0 && Game.player.credits >= costValue && c.legalLocation)
         {
            c.SetMode(c.mode+1); // place, rotate.
            if (c.mode == 2)
            {
               // Deduct cost
               Game.player.credits -= costValue;

               // Place tower in scene
               if (Network.isServer || Game.hostType == 0)
                  CreateTower(tower.type, GUIControl.cursorObject.transform.position, GUIControl.cursorObject.transform.rotation,
                     tower.AdjustRange(selectedRange, false),
                     tower.AdjustFOV(selectedFOV, false),
                     tower.AdjustFireRate(selectedFireRate, false),
                     tower.AdjustStrength(selectedStrength, false),
                     selectedEffect,
                     selectedColor.r, selectedColor.g, selectedColor.b,
                     selectedBehavior);
               else
                  netView.RPC("CreateTower", RPCMode.Server, tower.type, GUIControl.cursorObject.transform.position, GUIControl.cursorObject.transform.rotation,
                  tower.AdjustRange(selectedRange, false),
                  tower.AdjustFOV(selectedFOV, false),
                  tower.AdjustFireRate(selectedFireRate, false),
                  tower.AdjustStrength(selectedStrength, false),
                  selectedEffect,
                  selectedColor.r, selectedColor.g, selectedColor.b,
                  selectedBehavior);

               GUIControl.DestroyCursor();
               Game.player.selectedTower = null;
               enabled = false;
            }
         }
         else if (e.button == 1) // RMB undo placement
         {
            // Reset placement mode
            if (c.mode==0)
            {
               GUIControl.DestroyCursor();
               Game.player.selectedTower = null;
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
            Game.player.selectedTower = null;
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
   if (GUIControl.previewCamera && GUIControl.previewCamera.camera)
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

   if (Game.hostType > 0)
      newTower = Network.Instantiate(Resources.Load(prefabName, GameObject), pos, rot, 0);
   else
      newTower = Instantiate(Resources.Load(prefabName, GameObject), pos, rot);
   var t : Tower = newTower.GetComponent(Tower);

   t.Initialize(range, fov, rate, strength, effect, Color(colorRed, colorGreen, colorBlue), newBehaviour);
}
