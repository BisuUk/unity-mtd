#pragma strict
#pragma downcast

import CustomWidgets;

var tower : Tower;
var towerBase : TowerAttributes;
var colorCircle : Texture2D;
var previewItemPos : Transform;
var textStyle : GUIStyle;
var defendGUI : DefendGUI;
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
private var behaviourStrings : String[] = ["Weak", "Close", "Match"];
private var effectStrings : String[] = ["Dmg", "Slow", "Paint"];
private var valueStrings : String[] = ["L", "M", "H"];
private var lastSelTower : Tower = null;
private var cursorTower : Tower = null;
private var recalcCosts : boolean = false;
private var lastTooltip : String = "";
private var recalcChangedEffect : boolean;
private var multiSelect : boolean;

private var makeTowerNextRound : boolean;
private var makeTowerLoc : Vector3;
private var makeTowerRot : Quaternion;


function Awake()
{
   recalcChangedEffect = false;
   panelWidth = Screen.width*0.20;
   selectedColor = Color.white;
}

function SetMultiTower()
{
   enabled = true;
   multiSelect = true;
   modifyingExisting = true;

   tower = Game.player.selectedTowers[0];
   //selectedRange = tower.AdjustRange(tower.range, true);
   //selectedFOV = tower.AdjustFOV(tower.fov, true);
   //selectedEffect = tower.effect;
   //selectedFireRate = tower.AdjustFireRate(tower.fireRate, true);
   //selectedStrength = tower.AdjustStrength(tower.strength, true);
   selectedColor = tower.color;
   selectedBehavior = tower.targetingBehavior;
   recalcCosts = true;
}

function SetTower(newTower : Tower, duplicating : boolean)
{
   enabled = true;
   multiSelect = false;

   if (duplicating)
   {
      modifyingExisting = false;
      GUIControl.NewCursor(2, newTower.type);
      tower = GUIControl.cursorObject.GetComponent(Tower);
      towerBase = GUIControl.cursorObject.GetComponent(TowerAttributes);

      tower.SetColor(newTower.color);
      tower.SetRange(newTower.range);
      tower.SetFOV(newTower.fov);
      tower.SetFireRate(newTower.fireRate);
      tower.SetStrength(newTower.strength);
      tower.SetEffect(newTower.effect);
      tower.SetChildrenMaterialColor(tower.transform, tower.constructingMaterial, tower.color);
      NewPreviewItem(newTower.type);
      // unselect current tower
      Game.player.ClearSelectedTowers();
   }
   else // not duplicating the tower
   {
      GUIControl.DestroyCursor();
      modifyingExisting = true;
      tower = newTower;
      towerBase = tower.gameObject.GetComponent(TowerAttributes);
      NewPreviewItem(tower.type);
   }

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
   var keepAttributes : boolean = false;

   enabled = true;
   modifyingExisting = false;
   multiSelect = false;
   if (GUIControl.cursorObject)
      keepAttributes = true;

   GUIControl.NewCursor(2, type);
   tower = GUIControl.cursorObject.GetComponent(Tower);
   towerBase = GUIControl.cursorObject.GetComponent(TowerAttributes);
   tower.SetColor(selectedColor);
   NewPreviewItem(type);

   if (keepAttributes)
   {
      tower.SetRange(tower.AdjustRange(selectedRange, false));
      tower.SetFOV(tower.AdjustFOV(selectedFOV, false));
      tower.SetFireRate(tower.AdjustFireRate(selectedFireRate, false));
      tower.SetStrength(tower.AdjustStrength(selectedStrength, false));
      tower.SetEffect(selectedEffect);

      tower.tempRange = tower.AdjustRange(selectedRange, false);
      tower.tempFOV = tower.AdjustFOV(selectedFOV, false);
      tower.tempFireRate = tower.AdjustFireRate(selectedFireRate, false);
      tower.tempStrength = tower.AdjustStrength(selectedStrength, false);
      tower.tempEffect = selectedEffect;
   }
   else
   {
      selectedRange = tower.AdjustRange(towerBase.defaultRange, true);
      selectedFOV = tower.AdjustFOV(towerBase.defaultFOV, true);
      selectedFireRate = tower.AdjustFireRate(towerBase.defaultFireRate, true);
      selectedStrength = tower.AdjustStrength(towerBase.defaultStrength, true);
      selectedEffect = towerBase.defaultEffect;
      //selectedColor = Color.white;
      selectedBehavior = towerBase.defaultTargetBehavior;
   }
   recalcCosts = true;
}


function OnGUI()
{
   var e : Event = Event.current;
   var i : int = 0;

   if (recalcCosts)
   {
      var colorDiff : float;
      if (modifyingExisting)
      {
         if (!multiSelect)
         {
            //tower = Game.player.selectedTowers[0];
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

            // Changed effect of tower, charge full cost of tower.
            if (recalcChangedEffect)
            {
               costValue = possibleCostValue;
               timeValue = possibleTimeCostValue;
               recalcChangedEffect = false;
            }
         }
         else
         {
            costValue = 0;
            timeValue = 0;
            // without throwing off iterators.
            for (i = Game.player.selectedTowers.Count-1; i >= 0; --i)
            {
               tower = Game.player.selectedTowers[i];
               colorDiff = (1.0-Utility.ColorMatch(tower.color, selectedColor));
               costValue += (Game.player.selectedTowers[i].Cost()/2) * colorDiff;
            }
         }
      }
      else // Creating new tower
      {
         colorDiff = (1.0-Utility.ColorMatch(tower.tempColor, Color.white));
         costValue = tower.TempCost();
         //costValue += tower.costs.ColorDiffCost(tower.color, Color.white);
         costValue += (costValue/2) * colorDiff;

         timeValue = tower.TempTimeCost();
         //timeValue += tower.costs.ColorDiffTimeCost(tower.color, Color.white);
         timeValue += (timeValue/2) * colorDiff;
      }

      recalcCosts = false;
   }


   if (multiSelect)
      MultiTowerGUI();
   else
      SingleTowerGUI();

   // Mouseover testing, for sell button to show sell cost
   if (Event.current.type == EventType.Repaint && GUI.tooltip != lastTooltip)
   {
      // Just moused over sell button
      if (GUI.tooltip == "SellButton")
      {
         costValue = 0;
         for (i = Game.player.selectedTowers.Count-1; i >= 0; --i)
            costValue += Game.player.selectedTowers[i].Cost();
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



   // Note: This was added because if user clicked on the tower to place it,
   // the tower's OnMouseDown would trigger, selecting the tower. We don't want
   // to immediately select, so on a click, we put a flag up and wait one GUI
   // cycle to make the tower so OnMouseDown won't fire on the newly made tower.
   if (makeTowerNextRound)
   {
      makeTowerNextRound = false;

      // NOTE: Client is calculating cost, unsecure.
      Game.player.credits -= costValue;

      // Place tower in scene
      if (Network.isServer || Game.hostType == 0)
         CreateTower(tower.type, makeTowerLoc, makeTowerRot,
            tower.AdjustRange(selectedRange, false),
            tower.AdjustFOV(selectedFOV, false),
            tower.AdjustFireRate(selectedFireRate, false),
            tower.AdjustStrength(selectedStrength, false),
            selectedEffect,
            selectedColor.r, selectedColor.g, selectedColor.b,
            selectedBehavior);
      else
         netView.RPC("CreateTower", RPCMode.Server, tower.type, makeTowerLoc, makeTowerRot,
            tower.AdjustRange(selectedRange, false),
            tower.AdjustFOV(selectedFOV, false),
            tower.AdjustFireRate(selectedFireRate, false),
            tower.AdjustStrength(selectedStrength, false),
            selectedEffect,
            selectedColor.r, selectedColor.g, selectedColor.b,
            selectedBehavior);
   }


   if (GUIControl.cursorObject && defendGUI.selectedAbility==0)
   {
      // Update cursor
      var c : DefendGUICursor = GUIControl.cursorObject.GetComponent(DefendGUICursor);
      c.canAfford = Game.player.credits >= costValue;

      // Mouse event when using cursor
      if (e.isMouse && Input.mousePosition.x > panelWidth)
      {
         if (e.type == EventType.MouseDown)
         {
            // LMB - Check player can afford tower and legal placement
            if (e.button == 0)
            {
               if (c.canAfford == false)
                  GUIControl.OnScreenMessage("Not enough resources.", Color.red, 1.5);
               else if (c.legalLocation == false)
                  GUIControl.OnScreenMessage("Invalid tower location.", Color.red, 1.5);
               else
               {
                  // Advance to next mode
                  c.SetMode(c.mode+1);

                  if (c.mode == 2)
                  {
                     // Place tower next GUI cycle (see above as to why)
                     makeTowerNextRound = true;
                     makeTowerLoc = GUIControl.cursorObject.transform.position;
                     makeTowerRot = GUIControl.cursorObject.transform.rotation;
                     c.SetMode(0);
                  }
               }
            }
         }
         else if (e.type == EventType.MouseUp)
         {
            if (e.button == 1)
            {
               if (!GUIControl.RMBDragging)
               {
                  if (c.mode==0)
                  {
                     DestroyCursor();
                     enabled = false;
                  }
                  else // return from rotation to placement mode
                     c.SetMode(0);
               }
            }
         }
      }
   }
   else // no cursorObject
   {
      // Mouse events  while not using a cursor to place a tower
      if (e.type == EventType.MouseDown && e.isMouse && Input.mousePosition.x > panelWidth)
      {
         // RMB de-selects selected tower
         if (e.button == 1)
         {
            Game.player.ClearSelectedTowers();
            enabled = false;
         }
      }
   }

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      var tempVal : float;
      switch (e.keyCode)
      {
         case KeyCode.Space:
            PressApply();
            break;

         case KeyCode.A:
            tempVal = selectedStrength+(1/(valueStrings.Length-1.0));
            PressStrength((tempVal>1.0) ? 0 : tempVal);
            break;

         case KeyCode.S:
            tempVal = selectedRange+(1/(valueStrings.Length-1.0));
            PressRange((tempVal>1.0) ? 0 : tempVal);
            break;

         case KeyCode.D:
            tempVal = selectedFireRate+(1/(valueStrings.Length-1.0));
            PressFireRate((tempVal>1.0) ? 0 : tempVal);
            break;

         case KeyCode.Q:
            PressEffect(0);
            break;

         case KeyCode.W:
            PressEffect(1);
            break;

         case KeyCode.E:
            PressEffect(2);
            break;

         case KeyCode.X:
         case KeyCode.Delete:
            PressSell();
            break;

         case KeyCode.Escape:
            if (GUIControl.cursorObject)
            {
               var cr : DefendGUICursor = GUIControl.cursorObject.GetComponent(DefendGUICursor);
               if (cr.mode==0)
               {
                  DestroyCursor();
                  enabled = false;
               }
               else // return from rotation to placement mode
                  cr.SetMode(0);
             }
             else
               enabled = false;
            break;
      }
   }
}

function MultiTowerGUI()
{
   panelWidth = Screen.width*0.20;
   panelHeight = Screen.height;

   // Font style
   textStyle.fontStyle = FontStyle.Bold;
   textStyle.alignment = TextAnchor.MiddleCenter;

   var panelRect : Rect = Rect(0, 0, panelWidth, panelHeight);
   GUI.Box(panelRect,"");

   GUILayout.BeginArea(panelRect);

      GUILayout.BeginVertical();

         GUILayout.FlexibleSpace();

         // Effect selection grid
         textStyle.normal.textColor = Color.white;
         textStyle.fontSize = 15;
         GUILayout.Label("Color", textStyle);

         if (!modifyingExisting)
         {
            GUILayout.Space(10);
         
            // Color Wheel
            var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
            if (newlySelectedColor != selectedColor)
            {
               selectedColor = newlySelectedColor;
               recalcCosts = true;
               for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
               {
                  // Set cursor range, or set the selected towers temp range
                  Game.player.selectedTowers[i].SetTempColor(selectedColor);
               }
            }
         }
         GUILayout.FlexibleSpace();

         // Cost
         //if (costValue != 0)
         //{
            // Credits
            textStyle.normal.textColor = (costValue > Game.player.credits) ? Color.red : Utility.creditsTextColor;
            textStyle.fontSize = 30;
            GUILayout.Label((costValue>=0) ? costValue.ToString() : "+"+(-costValue).ToString(), textStyle);
            // Time
            //textStyle.normal.textColor = Color.white;
            //textStyle.fontSize = 20;
            //GUILayout.Label(timeValue.ToString("#.0")+"sec", textStyle);
         //}

         GUILayout.BeginHorizontal();
            // Sell button
            if (GUILayout.Button(GUIContent("Sell", "SellButton"), GUILayout.MinHeight(40)))
               PressSell();
            // Apply button
            if (GUILayout.Button(GUIContent("Apply", "ApplyButton"), GUILayout.MinHeight(40)))
               PressApply();
         GUILayout.EndHorizontal();
      GUILayout.EndVertical();
   GUILayout.EndArea();
}

function SingleTowerGUI()
{
   panelWidth = Screen.width*0.20;
   //panelHeight = Screen.height*0.90;
   panelHeight = Screen.height;
   var previewHeight : float = Screen.height-panelHeight;

   // Font style
   textStyle.fontStyle = FontStyle.Bold;
   textStyle.alignment = TextAnchor.MiddleCenter;

   // 3D Camera
   //GUIControl.previewCamera.camera.pixelRect = Rect(0, panelHeight, panelWidth, previewHeight);

   var panelRect : Rect = Rect(0, previewHeight, panelWidth, panelHeight);
   GUI.Box(panelRect,"");

   GUILayout.BeginArea(panelRect);

      GUILayout.BeginVertical();

         GUILayout.Space(15);

         if (!modifyingExisting)
         {
            // Effect selection grid
            textStyle.normal.textColor = Color.white;
            textStyle.fontSize = 15;
            GUILayout.Label("Effect", textStyle);
   
            var newlySelectedEffect : int = GUILayout.SelectionGrid(selectedEffect, effectStrings, 3, GUILayout.MinHeight(40));
            if (newlySelectedEffect != selectedEffect)
            {
               PressEffect(newlySelectedEffect);
            }
         }

         textStyle.normal.textColor = Color.white;
         textStyle.fontSize = 15;
         GUILayout.Label("Attributes", textStyle);

         var vslm1 : float = (valueStrings.Length-1.0);

         // Damage slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Str", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            //var newlySelectedStrength: float = GUILayout.HorizontalSlider(selectedStrength, 0.0, 1.0, GUILayout.ExpandWidth(true));
            var newlySelectedStrength : float = GUILayout.SelectionGrid(Mathf.CeilToInt(selectedStrength*vslm1), valueStrings, valueStrings.Length, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (Mathf.CeilToInt(selectedStrength*vslm1) != newlySelectedStrength)
            {
               PressStrength(newlySelectedStrength/vslm1);
            }
         GUILayout.EndHorizontal();

         // Range slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Range", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space (5);
            //var newlySelectedRange : float = GUILayout.HorizontalSlider(selectedRange, 0.0, 1.0, GUILayout.ExpandWidth(true));
            var newlySelectedRange : float = GUILayout.SelectionGrid(Mathf.CeilToInt(selectedRange*vslm1), valueStrings, valueStrings.Length, GUILayout.ExpandWidth(true));
            GUILayout.Space (5);
            if (Mathf.CeilToInt(selectedRange*vslm1) != newlySelectedRange)
            {
               PressRange(newlySelectedRange/vslm1);
            }
         GUILayout.EndHorizontal();
/*
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
*/
         // Rate of fire slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Rate", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            //var newlySelectedFireRate : float = GUILayout.HorizontalSlider(selectedFireRate, 0.0, 1.0, GUILayout.ExpandWidth(true));
            //Debug.Log("selectedFireRate="+selectedFireRate+" n="+Mathf.FloorToInt(selectedFireRate*valueStrings.Length));
            var newlySelectedFireRate : float = GUILayout.SelectionGrid(Mathf.CeilToInt(selectedFireRate*vslm1), valueStrings, valueStrings.Length, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);

            if (Mathf.CeilToInt(selectedFireRate*vslm1) != newlySelectedFireRate)
            {
               PressFireRate(newlySelectedFireRate/vslm1);
            }
         GUILayout.EndHorizontal();
         if (!modifyingExisting)
         {
            // Color Wheel
            var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
            if (newlySelectedColor != selectedColor)
            {
               selectedColor = newlySelectedColor;
               recalcCosts = true;
               tower.SetTempColor(selectedColor);
            }
         }

         // Behavior selection grid
         textStyle.normal.textColor = Color.white;
         textStyle.fontSize = 15;
         GUILayout.Label("Target", textStyle);
         var newlySelectedBehavior : int = GUILayout.SelectionGrid(selectedBehavior, behaviourStrings, 3, GUILayout.MinHeight(40));
         if (newlySelectedBehavior != selectedBehavior)
         {
            // Send immediately to server, no need for Apply
            selectedBehavior = newlySelectedBehavior;
            if (Network.isServer || (Game.hostType==0))
               tower.ModifyBehavior(selectedBehavior);
            else
               tower.netView.RPC("ModifyBehavior", RPCMode.Server, selectedBehavior);
         }

         GUILayout.FlexibleSpace(); // push everything down

         // Cost
         if (costValue != 0)
         {
            // Credits
            textStyle.normal.textColor = (costValue > Game.player.credits) ? Color.red : Utility.creditsTextColor;
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
            if (GUILayout.Button(GUIContent("Sell", "SellButton"), GUILayout.MinHeight(40)))
               PressSell();
            // Apply button
            if (GUILayout.Button(GUIContent("Apply", "ApplyButton"), GUILayout.MinHeight(40)))
               PressApply();
         }
         GUILayout.EndHorizontal();

      GUILayout.EndVertical();
   GUILayout.EndArea();
}

function PressEffect(val : int)
{
   selectedEffect = val;
   tower.SetTempEffect(selectedEffect);
   recalcChangedEffect = true;
   recalcCosts = true;
}

function PressStrength(val : float)
{
   selectedStrength = val;
   tower.SetTempStrength(tower.AdjustStrength(selectedStrength, false));
   recalcCosts = true;
}

function PressRange(val : float)
{
   selectedRange = val;
   tower.SetTempRange(tower.AdjustRange(selectedRange, false));
   recalcCosts = true;
}

function PressFireRate(val : float)
{
   selectedFireRate = val;
   tower.SetTempFireRate(tower.AdjustFireRate(selectedFireRate, false));
   recalcCosts = true;
}


function PressSell()
{
   // Return if we're placing a tower
   if (GUIControl.cursorObject)
      return;
   // NOTE: Iterates backwards so a remove can safely occur
   // without throwing off iterators.
   for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
   {
      Game.player.credits += Game.player.selectedTowers[i].Cost();
      if (Game.hostType>0)
         Network.Destroy(Game.player.selectedTowers[i].gameObject);
      else
         Destroy(Game.player.selectedTowers[i].gameObject);
   }
   Game.player.ClearSelectedTowers();
   enabled = false;
}

function PressApply()
{
   // Return if we're placing a tower
   if (GUIControl.cursorObject)
      return;

   // NOTE: Client is calculating cost, unsecure.
   if (!tower.legalLocation)
      GUIControl.OnScreenMessage("Not enough space for upgraded tower.", Color.red, 1.5);

   if (costValue > Game.player.credits)
      GUIControl.OnScreenMessage("Not enough resources.", Color.red, 1.5);

   if (costValue <= Game.player.credits && lastTooltip != "SellButton" && tower.legalLocation && tower.isConstructing==false)
   {
      Game.player.credits -= costValue;
      costValue = 0;

      for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
      {
         if (multiSelect)
         {
            if (Network.isServer || (Game.hostType==0))
               Game.player.selectedTowers[i].Modify(
                  Game.player.selectedTowers[i].range,
                  Game.player.selectedTowers[i].fov,
                  Game.player.selectedTowers[i].fireRate,
                  Game.player.selectedTowers[i].strength,
                  Game.player.selectedTowers[i].effect,
                  selectedColor.r, selectedColor.g, selectedColor.b,
                  Game.player.selectedTowers[i].targetingBehavior);
            else
               Game.player.selectedTowers[i].netView.RPC("Modify", RPCMode.Server,
                  Game.player.selectedTowers[i].range,
                  Game.player.selectedTowers[i].fov,
                  Game.player.selectedTowers[i].fireRate,
                  Game.player.selectedTowers[i].strength,
                  Game.player.selectedTowers[i].effect,
                  selectedColor.r, selectedColor.g, selectedColor.b,
                  Game.player.selectedTowers[i].targetingBehavior);
         }
         else
         {
            if (Network.isServer || (Game.hostType==0))
               Game.player.selectedTowers[i].Modify(
                  Game.player.selectedTowers[i].AdjustRange(selectedRange, false),
                  Game.player.selectedTowers[i].AdjustFOV(selectedFOV, false),
                  Game.player.selectedTowers[i].AdjustFireRate(selectedFireRate, false),
                  Game.player.selectedTowers[i].AdjustStrength(selectedStrength, false),
                  selectedEffect,
                  selectedColor.r, selectedColor.g, selectedColor.b,
                  selectedBehavior);
            else
               Game.player.selectedTowers[i].netView.RPC("Modify", RPCMode.Server,
                  Game.player.selectedTowers[i].AdjustRange(selectedRange, false),
                  Game.player.selectedTowers[i].AdjustFOV(selectedFOV, false),
                  Game.player.selectedTowers[i].AdjustFireRate(selectedFireRate, false),
                  Game.player.selectedTowers[i].AdjustStrength(selectedStrength, false),
                  selectedEffect,
                  selectedColor.r, selectedColor.g, selectedColor.b,
                  selectedBehavior);
         }
      }
   }
}

function OnEnable()
{
   SetPreviewItemVisible(true);
}

function OnDisable()
{
   SetPreviewItemVisible(false);
}

private function SetPreviewItemVisible(visible : boolean)
{
/*
   if (GUIControl.previewCamera && GUIControl.previewCamera.camera)
   {
      GUIControl.previewCamera.camera.enabled = visible;
      if (!visible)
         DestroyPreviewItem();
   }
*/
}

function DestroyCursor()
{
   GUIControl.DestroyCursor();
   selectedColor = Color.white;
   Game.player.ClearSelectedTowers();
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
/*
   if (type>0)
   {
      var prefabName : String = TowerUtil.PrefabName(type);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.name = "DefendGUIPreviewItem";
      previewItem.layer = 8; // 3D GUI layer
      previewItem.tag = "";  // Untag so multiselect, etc does not find
      for (var child : Transform in previewItem.transform)
         child.gameObject.layer = 8; // 3D GUI layer

      previewItem.GetComponent(Collider).enabled = false;   //remove collider
      Destroy(previewItem.GetComponent(Tower).FOV.gameObject); //remove AOE
      Destroy(previewItem.GetComponent(Tower).FOVCollider.gameObject); //remove AOE
      previewItem.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
      previewItem.AddComponent(DefendGUIPreviewItem);
   }
*/
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
