#pragma strict
#pragma downcast

var controlAreaSets : Transform[];
var colorArea : Transform;
//var attributeLabel : UILabel;
var strengthButton: UIButton;
var rateButton : UIButton;
var rangeButton : UIButton;
var revertButton : UIButton;
var sellButton : UIButton;
var applyButton : UIButton;
var abilityButton : UIButton;
var selectionBox : SelectionBox;
var dragDistanceThreshold : float = 10.0;
var creditsLabel : UILabel;
var scoreLabel : UILabel;
var timeLabel : UILabel;
var selectButtonPrefab : Transform;
var selectionsPerRow : int = 9;
var infoPanelAnchor : Transform;
var towerDetails : Transform;

private var towerCursor : DefendUICursor;
private var abilityCursor : AbilityBase;
private var cameraControl : CameraControl2;
private var isDragging : boolean;
private var strengthLabel : UILabel;
private var rateLabel : UILabel;
private var rangeLabel : UILabel;
private var showUnitHuds : boolean;

function Start()
{
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
   isDragging = false;

   strengthLabel = strengthButton.transform.Find("Label").GetComponent(UILabel);
   rateLabel = rateButton.transform.Find("Label").GetComponent(UILabel);
   rangeLabel = rangeButton.transform.Find("Label").GetComponent(UILabel);

   //showUnitHuds = true;
}

function Update()
{
   // WASD camera movement
   if (Input.GetKey(KeyCode.A))
      cameraControl.Pan(new Vector2(5,0));
   else if (Input.GetKey(KeyCode.D))
      cameraControl.Pan(new Vector2(-5,0));

   if (Input.GetKey(KeyCode.W))
      cameraControl.Zoom(0.1);
   else if (Input.GetKey(KeyCode.S))
      cameraControl.Zoom(-0.1);

   // Title bar
   scoreLabel.text = Game.control.score.ToString();

   creditsLabel.text = Game.player.credits.ToString();

   var minutes : float = Mathf.Floor(Game.control.roundTimeRemaining/60.0);
   var seconds : float = Mathf.Floor(Game.control.roundTimeRemaining%60.0);
   timeLabel.text = minutes.ToString("#0")+":"+seconds.ToString("#00");
}

function OnSwitchTo()
{
   Game.player.ClearAllSelections();
   cameraControl = Camera.main.GetComponent(CameraControl2);
   SwitchControlSet(0);
   UICamera.fallThrough = gameObject;
}

function OnClick()
{
   // LMB
   if (UICamera.currentTouchID == -1)
   {
      if (towerCursor)
      {
         // Click to place new tower cursor
         if (towerCursor.legalLocation == false)
            UIControl.OnScreenMessage("Invalid tower location.", Color.red, 1.5);
         else
         {
            // Go to next mode, if return true it's time to place a new tower
            if (towerCursor.NextMode())
            {
               var cost : int = towerCursor.tower.Cost();
               // Clientside check player can afford, will also be checked on server
               if (Game.control.CanPlayerAfford(cost))
               {
                  // Deduct cost, server will update as well
                  Game.player.credits -= cost;

                  // Place tower in scene
                  if (!Network.isClient)
                     Game.control.CreateTower(
                        towerCursor.tower.type,
                        towerCursor.transform.position, towerCursor.transform.rotation,
                        towerCursor.tower.attributePoints[AttributeType.STRENGTH],
                        towerCursor.tower.attributePoints[AttributeType.FIRERATE],
                        towerCursor.tower.attributePoints[AttributeType.RANGE],
                        towerCursor.tower.color.r, towerCursor.tower.color.g, towerCursor.tower.color.b,
                        towerCursor.tower.FOV.position,
                        new NetworkMessageInfo());
                  else
                     Game.control.netView.RPC("CreateTower", RPCMode.Server,
                        towerCursor.tower.type,
                        towerCursor.transform.position, towerCursor.transform.rotation,
                        towerCursor.tower.attributePoints[AttributeType.STRENGTH],
                        towerCursor.tower.attributePoints[AttributeType.FIRERATE],
                        towerCursor.tower.attributePoints[AttributeType.RANGE],
                        towerCursor.tower.color.r, towerCursor.tower.color.g, towerCursor.tower.color.b,
                        towerCursor.tower.FOV.position);
                  // Reset cursor
                  towerCursor.SetMode(0);
               }
               else
               {
                  UIControl.OnScreenMessage("Not enough credits.", Color.red, 1.5);
               }
            }
         }
      }
      else if (abilityCursor)
      {
         // Clientside check player can afford, will also be checked on server
         if (Game.control.CanPlayerAfford(Game.costs.Ability(abilityCursor.ID)))
         {
            // Cast ability
            if (!Network.isClient)
               Game.control.CastAbility(
                  abilityCursor.ID,
                  abilityCursor.transform.position,
                  abilityCursor.color.r,
                  abilityCursor.color.g,
                  abilityCursor.color.b,
                  new NetworkMessageInfo());
            else
               Game.control.netView.RPC("CastAbility", RPCMode.Server,
                  abilityCursor.ID,
                  abilityCursor.transform.position,
                  abilityCursor.color.r,
                  abilityCursor.color.g,
                  abilityCursor.color.b);
         }
         else
         {
            UIControl.OnScreenMessage("Not enough credits.", Color.red, 1.5);
         }
      }
   }
   // RMB
   else if (UICamera.currentTouchID == -2)
   {
      if (towerCursor)
      {
         // If we're dragging, move camera.
         // Otherwise go to previous cursor mode
         if (!isDragging && towerCursor.PrevMode())
         {
            OnAttributeBack();
            DestroyTowerCursor();
            UIControl.PanelTooltip("");
         }
      }
      else if (abilityCursor)
      {
         DestroyAbilityCursor();
         Utility.SetActiveRecursive(colorArea, false);
      }
      else // No cursors
      {
         if (!isDragging)
         {
            Game.player.ClearSelectedTowers();
            SwitchControlSet(0);
            Utility.SetActiveRecursive(colorArea, false);
            UIControl.PanelTooltip("");
         }
      }
      if (isDragging)
         cameraControl.Reorient();
      isDragging = false;
   }
}

function OnDoubleClick()
{
   if (!abilityCursor && !towerCursor && UICamera.currentTouchID == -1)
      cameraControl.SnapToFocusLocation();
}

function OnPress(isPressed : boolean)
{
   // LMB
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (isPressed)
         {
            selectionBox._dragStartPosition = Input.mousePosition;
            selectionBox._dragEndPosition = Input.mousePosition;
         }
         else
         {
            if (selectionBox._isDragging)
            {
               // Need to check for duplicates
               var append : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
               if (!append)
                  Game.player.ClearSelectedTowers();

               selectionBox.Select();
               for (var go : GameObject in selectionBox.selectedObjects)
               {
                  Game.player.SelectTower(go.GetComponent(Tower), true);
               }

               CheckSelections();
            }
         }
         selectionBox._isDragging = false;
      break;
   }
}

function OnDrag(delta : Vector2)
{
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (!towerCursor && !abilityCursor && ((selectionBox._dragStartPosition-Input.mousePosition).magnitude)>dragDistanceThreshold)
         {
            selectionBox._isDragging = true;
            selectionBox._dragEndPosition = Input.mousePosition;
         }
      break;
      // RMB
      case -2:
         cameraControl.Rotate(delta);
         isDragging = true;
      break;
      // MMB
      case -3:
         cameraControl.Pan(delta);
      break;
   }
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
}

function OnGUI()
{
   var e : Event = Event.current;

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.R:
         if (!e.shift)
            cameraControl.SnapToTopDownView();
         else
            cameraControl.SnapToDefaultView(Game.player.isAttacker);
         break;

      case KeyCode.F:
         cameraControl.SnapToFocusLocation();
         break;

      case KeyCode.Escape:
         UIControl.SwitchUI(2); // in game menu
         break;

      case KeyCode.V:
         ToggleUnitHuds();
         break;
      }
   }
}

function OnUnitSpawned(unit : Unit)
{
   if (unit)
      unit.SetHudVisible(showUnitHuds);
}

private function ToggleUnitHuds()
{
   showUnitHuds = !showUnitHuds;

   var objs: GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
   for (var go : GameObject in objs)
   {
      var unit : Unit = go.GetComponent(Unit);
      if (unit)
         unit.SetHudVisible(showUnitHuds);
   }
}

function OnMouseEnterUnit(unit : Unit)
{
   if (towerCursor==null && abilityCursor==null)
   {
      unit.SetHovered(true);
      unit.SetHudVisible(true);
      UIControl.PanelTooltip(unit.GetToolTipString());
   }
}

function OnMouseExitUnit(unit : Unit)
{
   if (towerCursor==null && abilityCursor==null)
   {
      unit.SetHovered(false);
      unit.SetHudVisible(false);
      UIControl.PanelTooltip("");
   }
}

function OnMouseEnterTower(tower : Tower)
{
   if (towerCursor==null && abilityCursor==null)
      tower.SetHovered(true);
}

function OnMouseExitTower(tower : Tower)
{
   if (towerCursor==null && abilityCursor==null)
      tower.SetHovered(false);
}


function OnClickTower(tower : Tower)
{
   if (towerCursor==null && abilityCursor==null)
   {
      var shiftHeld : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
      var ctrlHeld : boolean = Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl);

      if (ctrlHeld)
         Game.player.SelectTowerType(tower.type);
      else
         Game.player.SelectTower(tower, shiftHeld);

      CheckSelections();
   }
}

function OnSelectSelectionTower(tower : Tower)
{
   if (UICamera.currentTouchID == -1)
   {
      var shiftHeld : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
      var ctrlHeld : boolean = Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl);
   
      if (ctrlHeld)
         Game.player.FilterTowerType(tower.type);
      else if (shiftHeld)
         Game.player.DeselectTower(tower);
      else
         Game.player.SelectTower(tower, false);
      CheckSelections();

      OnMouseExitTower(tower);
   }
   else if (UICamera.currentTouchID == -2)
   {
/*
      if (unit)
      {
         if (Network.isClient)
            unit.netView.RPC("UseAbility1", RPCMode.Server);
         else
            unit.UseAbility1();
      }
*/
   }
}

function DestroyInfoPanelChildren()
{
   for (var child : Transform in infoPanelAnchor)
      Destroy(child.gameObject);
}

function CheckSelections()
{
   DestroyInfoPanelChildren();

   var selectionCount : int = 0;
   var xOffset : float = 0.15;
   var yOffset : float = -0.02;

   for (var tower : TowerSelection in Game.player.selectedTowers)
   {
      var newButton : GameObject = NGUITools.AddChild(infoPanelAnchor.gameObject, selectButtonPrefab.gameObject);
      newButton.transform.position.x += xOffset;
      newButton.transform.position.y += yOffset;
      var b : DefendUISelectionButton = newButton.GetComponent(DefendUISelectionButton);
      b.ui = this;
      b.tower = tower.selectionFor;

      var captionString : String;
      switch (tower.selectionFor.type)
      {
         case 0: captionString = "Light"; break;
         case 1: captionString = "Mortar"; break;
         case 2: captionString = "Slow"; break;
         case 3: captionString = "Paint"; break;
      }
      b.SetCaption(captionString);
      b.SetColor(tower.selectionFor.color);

      xOffset += 0.195;

      if (((selectionCount+1) % selectionsPerRow) == 0)
      {
         xOffset =  0.15;
         yOffset += -0.16;
      }

      selectionCount += 1;
   }

   if (selectionCount==0)
   {
      DestroyInfoPanelChildren();
      SwitchControlSet(0);
      Utility.SetActiveRecursive(towerDetails, false);
   }
   // Show details if it's just one selection
   else if (selectionCount==1)
   {
      DestroyInfoPanelChildren();
      SwitchControlSet(1);
      Utility.SetActiveRecursive(towerDetails, true);
   }
   else
   {
      SwitchControlSet(1);
      Utility.SetActiveRecursive(towerDetails, false);
   }
}

function NewTowerCursor(type : int)
{
   DestroyTowerCursor();
   DestroyAbilityCursor();

   var prefabName : String = TowerUtil.PrefabName(type);
   var cursorObject : GameObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
   cursorObject.name = "DefendTowerCursor";
   cursorObject.tag = "";
   cursorObject.GetComponent(Collider).enabled = false;
   towerCursor = cursorObject.AddComponent(DefendUICursor);
   towerCursor.SetMode(0);

   cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
}

function DestroyTowerCursor()
{
   if (towerCursor)
   {
      for (var child : Transform in towerCursor.transform)
         Destroy(child.gameObject);
      Destroy(towerCursor.gameObject);
   }
}

function NewAbilityCursor(type : int)
{
   DestroyTowerCursor();
   DestroyAbilityCursor();

   var cursorObject : GameObject = Instantiate(Resources.Load(AbilityBase.GetPrefabName(type), GameObject), Vector3.zero, Quaternion.identity);
   cursorObject.name = "DefendAbilityCursor";
   cursorObject.tag = "";
   cursorObject.SendMessage("MakeCursor", true);
   cursorObject.collider.enabled = false;
   abilityCursor = cursorObject.GetComponent(AbilityBase);
}

function DestroyAbilityCursor()
{
   if (abilityCursor)
   {
      for (var child : Transform in abilityCursor.transform)
         Destroy(child.gameObject);
      Destroy(abilityCursor.gameObject);
   }
}

function OnAttributeBack()
{
   DestroyTowerCursor();
   Game.player.ClearSelectedTowers();
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
}

private function SelectTowerType(towerType : int)
{
   NewTowerCursor(towerType);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnRangedTower()
{
   SelectTowerType(0);
}

function OnMortarTower()
{
   SelectTowerType(1);
}

function OnSlowTower()
{
   SelectTowerType(2);
}

function OnPainterTower()
{
   SelectTowerType(3);
}

function OnBlastAbility()
{
   NewAbilityCursor(0);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnPaintAbility()
{
   NewAbilityCursor(1);
   Utility.SetActiveRecursive(colorArea, true);
}

private function SetTowerDetailsVisible(visible : boolean)
{
   Utility.SetActiveRecursive(towerDetails, visible);
}

function SwitchControlSet(newSet : int)
{
   // 0=Default, tower select, user abilities etc.
   // 1=Tower attrib controls, tower abilities

   DestroyAbilityCursor();

   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }

   // Switched to attribute set
   if (newSet==1)
   {
      Utility.SetActiveRecursive(revertButton.transform, (towerCursor==null));
      Utility.SetActiveRecursive(sellButton.transform, (towerCursor==null));
      Utility.SetActiveRecursive(applyButton.transform, (towerCursor==null));
      Utility.SetActiveRecursive(abilityButton.transform, (towerCursor==null));
      //Utility.SetActiveRecursive(attributeLabel.transform, (towerCursor!=null || Game.player.selectedTowers.Count==1));
      OnUpdateAttributes();
   }
   else if (newSet==0)
   {
      DestroyInfoPanelChildren();
      SetTowerDetailsVisible(false);
   }
}

function OnUpdateAttributes()
{
   var t : Tower = null;

   if (Game.player.selectedTowers.Count>1)
   {
      strengthLabel.text = "-";
      rateLabel.text = "-";
      rangeLabel.text = "-";
      //attributeLabel.text = "-";
   }
   else
   {
      if (towerCursor)
      {
         Game.player.ClearSelectedTowers();
         t = towerCursor.tower;
      }
      else if (Game.player.selectedTowers.Count==1)
         t = Game.player.selectedTowers[0].tower;
   
      if (t)
      {
         strengthLabel.text = t.attributePoints[AttributeType.STRENGTH].ToString();
         rateLabel.text = t.attributePoints[AttributeType.FIRERATE].ToString();
         rangeLabel.text = t.attributePoints[AttributeType.RANGE].ToString();
         //attributeLabel.text = t.UsedAttributePoints()+"/"+t.maxAttributePoints;
      }
   }
}

function OnStrength()
{
   ModifyAttributePoint(AttributeType.STRENGTH);
}

function OnRate()
{
   ModifyAttributePoint(AttributeType.FIRERATE);
}

function OnRange()
{
   ModifyAttributePoint(AttributeType.RANGE);
}

function ModifyAttributePoint(type : AttributeType)
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;

   var t : Tower = null;

   if (Game.player.selectedTowers.Count > 1)
   {
      for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
      {
         t = Game.player.selectedTowers[i].tower;
         if (t)
         {
            if (UICamera.currentTouchID == -1)
               t.ModifyAttributePoints(type, 1);
            else if (UICamera.currentTouchID == -2)
               t.ModifyAttributePoints(type, -1);
         }
      }
   }
   else
   {
      if (towerCursor)
         t = towerCursor.tower;
      else if (Game.player.selectedTowers.Count == 1)
         t = Game.player.selectedTowers[0].tower;

      if (t)
      {
         if (UICamera.currentTouchID == -1)
         {
            if (t.ModifyAttributePoints(type, 1))
               OnUpdateAttributes();
            else
               UIControl.OnScreenMessage("Not enough attribute points.", Color.red, 1.5);
         }
         else if (UICamera.currentTouchID == -2)
         {
            if (t.ModifyAttributePoints(type, -1))
               OnUpdateAttributes();
         }
      }
   }
   if (towerCursor)
      UIControl.PanelTooltip(towerCursor.tower.tooltip+"\\n\\nCost: [00FF00]"+towerCursor.tower.Cost());
}


function ModifyAttributePoint(type : AttributeType, amount : int)
{
   var t : Tower = null;

   if (Game.player.selectedTowers.Count > 1)
   {
      for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
      {
         t = Game.player.selectedTowers[i].tower;
         t.ModifyAttributePoints(type, amount);
      }
   }
   else
   {
      if (towerCursor)
         t = towerCursor.tower;
      else if (Game.player.selectedTowers.Count == 1)
         t = Game.player.selectedTowers[0].tower;

      if (t && t.ModifyAttributePoints(type, amount))
         OnUpdateAttributes();
   }
}

function OnSell()
{
   // NOTE: Iterates backwards so a remove can safely occur
   // without throwing off iterators.
   for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
   {
      //Game.player.credits += Game.player.selectedTowers[i].Cost();
      // NOTE: Client deleting object, unsecure
      if (Game.hostType>0)
         Network.Destroy(Game.player.selectedTowers[i].selectionFor.gameObject);
      else
         Destroy(Game.player.selectedTowers[i].selectionFor.gameObject);
   }
   Game.player.ClearSelectedTowers();
   SwitchControlSet(0);
}

function OnRevert()
{
   for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
      Game.player.selectedTowers[i].tower.CopyAttributePoints(Game.player.selectedTowers[i].selectionFor);

   OnUpdateAttributes();
}

function OnReset()
{
   if (towerCursor)
      towerCursor.tower.ResetAttributePoints();
   else
   {
      for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
         Game.player.selectedTowers[i].tower.ResetAttributePoints();
   }
   OnUpdateAttributes();
}

function OnApply()
{
   var s : TowerSelection = null;
   var count : int = Game.player.selectedTowers.Count;

   for (var i : int = count-1; i >= 0; --i)
   {
      s = Game.player.selectedTowers[i];

      // No attributes changed
      if (!s.hasNewSettings)
         continue;

      // Legally placed
      if (!s.tower.legalLocation) //costValue <= Game.player.credits && )
      {
         if (count==1)
            UIControl.OnScreenMessage("Not enough space for upgraded tower.", Color.red, 1.5);
         continue;
      }

      // Under construction
      if (s.selectionFor.isConstructing)
         continue;

      // Check cost
      var costDiff : int =  s.tower.Cost() - s.selectionFor.Cost();

      // Clientside check player can afford, will also be checked on server
      if (Game.control.CanPlayerAfford(costDiff))
      {
         // Deduct cost, server will update as well
         Game.player.credits -= costDiff;

         // Send modify command
         if (!Network.isClient)
           s.selectionFor.Modify(
               s.tower.attributePoints[AttributeType.STRENGTH],
               s.tower.attributePoints[AttributeType.FIRERATE],
               s.tower.attributePoints[AttributeType.RANGE]);
         else
            s.selectionFor.netView.RPC("FromClientModify", RPCMode.Server,
               s.tower.attributePoints[AttributeType.STRENGTH],
               s.tower.attributePoints[AttributeType.FIRERATE],
               s.tower.attributePoints[AttributeType.RANGE]);
         // Reset tower selection to new settings
         s.SetSelectionFor(s.selectionFor);
      }
      else
         UIControl.OnScreenMessage("Not enough credits.", Color.red, 1.5);
   }
}

private function SetColor(color : Color)
{
   if (towerCursor)
      towerCursor.tower.SetColor(color, false);
   else if (abilityCursor)
      abilityCursor.SetColor(color);
}

function OnWhite()
{
   SetColor(Color.white);
}

function OnBlue()
{
   SetColor(Color.blue);
}

function OnMagenta()
{
   SetColor(Color.magenta);
}

function OnRed()
{
   SetColor(Color.red);
}

function OnYellow()
{
   SetColor(Color.yellow);
}

function OnGreen()
{
   SetColor(Color.green);
}

function OnCyan()
{
   SetColor(Color.cyan);
}

function OnTooltipTrigger(data : TooltipTriggerData)
{
   // Hide
   if (!data.enterHover)
   {
      if (data.usePanelTooltip)
      {
         if (abilityCursor) // Still placing an ability, leave tooltip up
            UIControl.PanelTooltip(abilityCursor.tooltip+"\\n\\nCost: [00FF00]"+Game.costs.Ability(abilityCursor.ID));
         else if (towerCursor) // Still placing a tower, leave tooltip up
            UIControl.PanelTooltip(towerCursor.tower.tooltip+"\\n\\nCost: [00FF00]"+towerCursor.tower.Cost());
         else
         {
            UIControl.PanelTooltip("");
            //switch (data.id)
            //{
            //   case WidgetIDEnum.BUTTON_TOWER_ATTRIB_RANGE:
            //      ModifyAttributePoint(AttributeType.RANGE, -1);
            //   break;
            //}
         }
      }
      else
         UIControl.HoverTooltip("", data.offset);
   }
   else // Make visible
   {
      var tooltipString : String;
      var cost : int;
      tooltipString = data.text;
      // Some tooltips require some dynamic data, add that here.
      switch (data.id)
      {
         case WidgetIDEnum.BUTTON_TOWER_ATTRIB_STRENGTH:
            if (towerCursor)
               tooltipString = towerCursor.tower.tooltip+"\\n\\nCost: [00FF00]"+towerCursor.tower.Cost();
         break;

         case WidgetIDEnum.BUTTON_TOWER_LIGHTNING:
            tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.tower[0].TotalCost(0.0f,0.0f,0.0f);
         break;

         case WidgetIDEnum.BUTTON_TOWER_SELL:
            tooltipString = tooltipString+"\\n\\n\\nValue: [00FF00]"+GetSellTooltipValue();
         break;

         case WidgetIDEnum.BUTTON_TOWER_APPLY:
            tooltipString = tooltipString+"\\n\\n\\nCost: [00FF00]"+GetApplyTooltipValue()*-1;
         break;

           //case WidgetIDEnum.BUTTON_TOWER_ATTRIB_RANGE:
         //   if (!towerCursor)
         //      ModifyAttributePoint(AttributeType.RANGE, 1);
         //break;

         case WidgetIDEnum.BUTTON_TOWER_MORTAR:

            //tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.tower[0].TotalCost(0f,0f,0f);
         break;
      }

      // Panel tooltip is right above the user controls
      if (data.usePanelTooltip)
         UIControl.PanelTooltip(tooltipString);
      else
      {
         // For the hover tooltip, we get the hovered widgets screen pos,
         // otherwise we use the mouse pos.
         if (data.offsetFromWidget)
         {
            var widgetScreenPos : Vector2 = UICamera.mainCamera.WorldToScreenPoint(data.widget.position);
            UIControl.HoverTooltip(tooltipString, widgetScreenPos + data.offset);
         }
         else
            UIControl.HoverTooltip(tooltipString, Input.mousePosition + data.offset);
      }
   }
}

function GetSellTooltipValue() : int
{
   var cost : int = 0;
   for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
   {
      cost += Game.player.selectedTowers[i].tower.Cost();
   }
   return cost;
}

function GetApplyTooltipValue() : int
{
   var cost : int = 0;
   for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
   {
      cost += (Game.player.selectedTowers[i].selectionFor.Cost() - Game.player.selectedTowers[i].tower.Cost());
   }
   return cost;
}