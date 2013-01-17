#pragma strict
#pragma downcast

static var uiIndex : int = 10;

var controlAreaSets : Transform[];
var colorPalette : Transform;
var infoPanelAnchor : Transform;
var newSelectionPrefab : Transform;
var newEmitterQueueUnitPrefab : Transform;
var selectionBox : SelectionBox;
var dragDistanceThreshold : float = 10.0;
var selectionsPerRow : int = 9;
var autoLaunchButton : UIButton;
var launchButton : UIButton;
var emitterStrengthButtons: UIButton[];
var emitterCost : UILabel;
var increaseGameSpeedButton : UIButton;
var decreaseGameSpeedButton : UIButton;
var unitDetailPortrait : UIButton;
var unitDetailHealth : UISlider;
var infoPanelBackgroundBig : Transform;
var infoPanelBackgroundSmall : Transform;
var creditsLabel : UILabel;
var scoreLabel : UILabel;
var timeLabel : UILabel;

private var isDragging : boolean;
private var cameraControl : CameraControl;
private var abilityCursor : AbilityBase;
private var controlSet : int;
private var baseOffsetX : float = 0.15;
private var baseOffsetY : float = -0.02;
private var strideX : float = 0.195;
private var strideY : float = -0.16;
private var lastSelectedAbilityColor : Color = Game.defaultColor;
private var hoverUnit : Unit;

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
         cameraControl.SnapToFocusMouseLocation();
         break;

      case KeyCode.Escape:
         UIControl.SwitchUI(2); // in game menu
         break;
      }
   }
}

function Update()
{
/*
   // WASD camera movement
   if (Input.GetKey(KeyCode.A))
      cameraControl.Pan(new Vector2(5,0));
   else if (Input.GetKey(KeyCode.D))
      cameraControl.Pan(new Vector2(-5,0));

   if (Input.GetKey(KeyCode.W))
      cameraControl.Zoom(0.1);
   else if (Input.GetKey(KeyCode.S))
      cameraControl.Zoom(-0.1);
*/
   // Update launch button
   if (controlSet==3)
   {
      UpdateUnitDetails();
   }
   else
   {
      var emitter : Emitter = null;
      if (Game.player.selectedStructure)
         emitter = Game.player.selectedStructure.GetComponent(Emitter);
      if (emitter)
      {
         var cost : int = emitter.GetCost();
         var diff : int = Game.player.credits - cost;
         if (diff < 0)
         {
            emitterCost.color = Color.red;
            emitterCost.text = cost.ToString()+" ("+diff+")";
            launchButton.isEnabled = false;
         }
         else
         {
            emitterCost.color = Color.green;
            emitterCost.text = cost.ToString();
            launchButton.isEnabled = (emitter.isLaunchingQueue==false);
         }
      }
   }

   // Title bar
   scoreLabel.text = Game.control.score.ToString();

   creditsLabel.text = Game.player.credits.ToString();
   if (Game.map.useCreditCapacities)
      creditsLabel.text += (" / "+Game.player.creditCapacity.ToString());
   creditsLabel.color = (Game.player.credits == Game.player.creditCapacity) ? Color.yellow : Color.green;

   var minutes : float = Mathf.Floor(Game.control.levelTime/60.0);
   var seconds : float = Mathf.Floor(Game.control.levelTime%60.0);
   timeLabel.text = minutes.ToString("#0")+":"+seconds.ToString("#00");
}

function OnSwitchFrom()
{
   DestroyInfoPanelChildren();
   DestroyAbilityCursor();
   Game.player.ClearAllSelections();
   UIControl.PanelTooltip("");
}

function OnSwitchTo()
{
   Game.player.ClearAllSelections();
   cameraControl = Camera.main.GetComponent(CameraControl);
   UICamera.fallThrough = gameObject;
   SwitchControlSet(0);
   isDragging = false;
}

function SwitchControlSet(newSet : int)
{
   // 0=Default, abilities etc.
   // 1=Emitter controls
   // 2=Multi unit select
   // 3=Single unit select
   DestroyAbilityCursor();

   controlSet = newSet;
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      controlAreaSets[i].gameObject.SetActive(i == newSet);
   }
   colorPalette.gameObject.SetActive(newSet==1);

   if (newSet==0)
   {
      increaseGameSpeedButton.gameObject.SetActive(!Network.isClient);
      decreaseGameSpeedButton.gameObject.SetActive(!Network.isClient);
      SetInfoBackground(0);
   }
   else
      SetInfoBackground(2);
}

private function SetInfoBackground(style : int)
{
   infoPanelBackgroundSmall.gameObject.SetActive(style == 1);
   infoPanelBackgroundBig.gameObject.SetActive(style == 2);
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
                  Game.player.ClearSelectedUnits();

               selectionBox.Select();
               for (var go : GameObject in selectionBox.selectedObjects)
               {
                  Game.player.SelectUnit(go.GetComponent(Unit), true);
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
         if (((selectionBox._dragStartPosition-Input.mousePosition).magnitude) > dragDistanceThreshold)
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

function OnClick()
{
   // LMB
   if (UICamera.currentTouchID == -1)
   {
      if (abilityCursor)
      {
         // Check player can afford, will also be checked on server
         var cost : int = Game.costs.Ability(abilityCursor.ID);
         if (Game.control.CanPlayerAfford(cost))
         {
            // Deduct cost, server will update as well
            Game.player.credits -= cost;

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
   //RMB
   else if (UICamera.currentTouchID == -2)
   {
      if (!isDragging)
      {
         //if (cameraControl.isZoomedOut)
         //   cameraControl.SnapToFocusMouseLocation();
         //else
         //{
            DestroyInfoPanelChildren();
            DestroyAbilityCursor();
            Game.player.ClearAllSelections();
            SwitchControlSet(0);
            UIControl.PanelTooltip("");
         //}
      }
      else
      {
         //cameraControl.Reorient();
         cameraControl.SetRotating(false);
      }

      isDragging = false;
   }
}

function OnDoubleClick()
{
   // Need a new way to do this
   if (hoverUnit)
   {
      Game.player.SelectUnitType(hoverUnit.unitType);
      CheckSelections();
   }
   //else if (!abilityCursor && UICamera.currentTouchID == -1)
      //cameraControl.SnapToFocusLocation();
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
}

function OnMouseEnterUnit(unit : Unit)
{
   if (abilityCursor==null)
   {
      hoverUnit = unit;
      unit.SetHovered(true);
      unit.SetHudVisible(true);
      UIControl.PanelTooltip(unit.GetToolTipString());
   }
}

function OnMouseExitUnit(unit : Unit)
{
   if (abilityCursor==null)
   {
      if (hoverUnit == unit)
         hoverUnit = null;
      unit.SetHovered(false);
      unit.SetHudVisible(false);
      UIControl.PanelTooltip("");
   }
}

function OnMouseEnterTower(tower : Tower)
{
   if (abilityCursor==null)
      tower.SetHovered(true);
}

function OnMouseExitTower(tower : Tower)
{
   if (abilityCursor==null)
      tower.SetHovered(false);
}

function OnMouseEnterEmitter(emitter : Emitter)
{
   if (abilityCursor==null)
      emitter.SetHovered(true);
}

function OnMouseExitEmitter(emitter : Emitter)
{
   if (abilityCursor==null)
      emitter.SetHovered(false);
}

function DestroyInfoPanelChildren()
{
   for (var child : Transform in infoPanelAnchor)
      Destroy(child.gameObject);
}

function NewAbilityCursor(type : int)
{
   DestroyAbilityCursor();

   var cursorObject : GameObject = Instantiate(Game.prefab.Ability(type), Vector3.zero, Quaternion.identity);
   cursorObject.name = "AttackAbilityCursor";
   cursorObject.tag = "";
   cursorObject.SendMessage("MakeCursor", true);
   cursorObject.collider.enabled = false;
   abilityCursor = cursorObject.GetComponent(AbilityBase);
   abilityCursor.SetColor(lastSelectedAbilityColor);
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

function CheckSelections()
{
   DestroyInfoPanelChildren();

   var selectionCount : int = 0;
   var xOffset : float = baseOffsetX;
   var yOffset : float = baseOffsetY;

   for (var unit : Unit in Game.player.selectedUnits)
   {
      var newButton : GameObject = NGUITools.AddChild(infoPanelAnchor.gameObject, newSelectionPrefab.gameObject);
      newButton.transform.position.x += xOffset;
      newButton.transform.position.y += yOffset;
      var b : AttackUISelectionButton = newButton.GetComponent(AttackUISelectionButton);
      b.attackUI = this;
      b.unit = unit;

      var captionString : String;
      switch (unit.unitType)
      {
         case 0: captionString = "Point"; break;
         case 1: captionString = "Heal"; break;
         case 2: captionString = "Shield"; break;
         case 3: captionString = "Stun"; break;
      }
      b.SetCaption(captionString);
      b.SetColor(unit.color);

      xOffset += strideX;

      if (((selectionCount+1) % selectionsPerRow) == 0)
      {
         xOffset = baseOffsetX;
         yOffset += strideY;
      }

      selectionCount += 1;
   }
   // Show details if it's just one unit
   if (selectionCount==0)
   {
      DestroyInfoPanelChildren();
      SwitchControlSet(0);
   }
   else if (selectionCount==1)
   {
      DestroyInfoPanelChildren();
      SwitchControlSet(3);
   }
   else
      SwitchControlSet(2);
}

function OnSelectSelectionUnit(unit : Unit)
{
   if (UICamera.currentTouchID == -1)
   {
      var shiftHeld : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
      var ctrlHeld : boolean = Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl);
   
      if (ctrlHeld)
         Game.player.FilterUnitType(unit.unitType);
      else if (shiftHeld)
         Game.player.DeselectUnit(unit);
      else
         Game.player.SelectUnit(unit, false);
      CheckSelections();
   
      OnMouseExitUnit(unit);
   }
   else if (UICamera.currentTouchID == -2)
   {
      if (unit)
      {
         if (Network.isClient)
            unit.netView.RPC("UseAbility1", RPCMode.Server);
         else
            unit.UseAbility1();
      }
   }
}

function OnClickUnit(unit : Unit)
{
   if (abilityCursor==null)
   {
      var shiftHeld : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
      var ctrlHeld : boolean = Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl);
   
      if (ctrlHeld)
         Game.player.SelectUnitType(unit.unitType);
      else
         Game.player.SelectUnit(unit, shiftHeld);
      CheckSelections();
   }
}

function OnSelectQueueUnit(index : int)
{
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
      break;
      // RMB
      case -2:
         var emitter : Emitter = null;
         if (Game.player.selectedStructure)
            emitter = Game.player.selectedStructure.GetComponent(Emitter);
         if (emitter)
            emitter.RemoveFromQueue(index);
         UpdateEmitterInfo();
      break;
   }
}

function UpdateUnitDetails()
{
   if (Game.player.selectedUnits.Count==1)
   {
      var u : Unit = Game.player.selectedUnits[0];
      // If dead return to default mode
      if (u == null)
         SwitchControlSet(0);
      else
      {
         unitDetailHealth.sliderValue = 1.0*u.health/u.maxHealth;
      }
   }
}

private function SetEmitterStrengthButton(which : int)
{
/*
   var i : int = 0;
   for (i=0; i<emitterStrengthButtons.Length; i++)
   {
      emitterStrengthButtons[i].defaultColor = (which==i) ? Color.green : Color.white;
      emitterStrengthButtons[i].UpdateColor(true, false);
   }
*/   
}

private function UpdateEmitterInfo()
{
   DestroyInfoPanelChildren();

   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      var queueCount : int = 1;
      var xOffset : float = baseOffsetX;
      var yOffset : float = -0.2;

      autoLaunchButton.defaultColor = (emitter.autoLaunch) ? Color.green : Color.white;
      autoLaunchButton.UpdateColor(true, false);

      switch (emitter.strength)
      {
         case 1.0: SetEmitterStrengthButton(2); break;
         case 0.5: SetEmitterStrengthButton(1); break;
         case 0.0: SetEmitterStrengthButton(0); break;
      }
   
      for (var ua : UnitAttributes in emitter.unitQueue)
      {
         var newQueueUnit : GameObject = NGUITools.AddChild(infoPanelAnchor.gameObject, newEmitterQueueUnitPrefab.gameObject);
         newQueueUnit.transform.position.x += xOffset;
         newQueueUnit.transform.position.y += yOffset;
         var b : AttackUIEmitterQueueButton = newQueueUnit.GetComponent(AttackUIEmitterQueueButton);
         b.attackUI = this;
         b.queuePosition = queueCount-1;
         b.cost.text = Game.costs.Unit(ua.unitType, emitter.strength).ToString();
   
         switch (ua.unitType)
         {
            case 0: b.caption.text = "Point"; break;
            case 1: b.caption.text = "Heal"; break;
            case 2: b.caption.text = "Shield"; break;
            case 3: b.caption.text = "Stun"; break;
         }
   
         b.background.color = emitter.color;
   
         if (queueCount == 1)
            newQueueUnit.transform.Find("ReorderButton").gameObject.SetActive(false);

         xOffset += 0.255;
         queueCount += 1;
      }
   }
}

function OnAbility1()
{
   for (var unit : Unit in Game.player.selectedUnits)
   {
      if (unit)
      {
         if (Network.isClient)
            unit.netView.RPC("UseAbility1", RPCMode.Server);
         else
            unit.UseAbility1();
      }
   }
}


private function SetStrength(newStrength : float)
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      emitter.SetStrength(newStrength);
      UpdateEmitterInfo();
   }
}

function OnEmitterHeavy()
{
   SetStrength(1.0);
}

function OnEmitterMedium()
{
   SetStrength(0.5);
}

function OnEmitterLight()
{
   SetStrength(0.0);
}

function OnUnitPortrait()
{
   if (Game.player.selectedUnits.Count==1)
   {
      var u : Unit = Game.player.selectedUnits[0];
      // If dead return to default mode
      if (u == null)
         SwitchControlSet(0);
      else
      {
         cameraControl.SnapToLocation(u.transform.position, true);
      }
   }
}

function OnRemoveQueueUnit(index : int)
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
      emitter.RemoveFromQueue(index);
   UpdateEmitterInfo();
}

function OnReorderQueueUnit(index : int)
{
   if (index < 1)
      return;

   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      emitter.MoveInQueue(index-1, false);
      UpdateEmitterInfo();
   }
}

function OnSelectEmitter(emitter : Emitter)
{
   Game.player.SelectStructure(emitter);
   SwitchControlSet(1);
   UpdateEmitterInfo();
}

function OnLaunch()
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
      emitter.Launch();
}

function OnAutoLaunch()
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      emitter.autoLaunch = !emitter.autoLaunch;
      autoLaunchButton.defaultColor = (emitter.autoLaunch) ? Color.green : Color.white;
   }
}

function OnReset()
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
      emitter.Reset();
   UpdateEmitterInfo();
}

private function AddUnitToQueue(type : int)
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      var ua : UnitAttributes = new UnitAttributes();
      ua.unitType = type;
      ua.size = 0.0;
      ua.strength = 0.0;
      ua.color = emitter.color;
      if (!emitter.AddToQueue(ua))
         UIControl.OnScreenMessage("Queue is full.", Color.red, 1.5);
   }
   UpdateEmitterInfo();
}

function OnPoint()
{
   AddUnitToQueue(0);
}

function OnHealer()
{
   AddUnitToQueue(1);
}

function OnShield()
{
   AddUnitToQueue(2);
}

function OnStunner()
{
   AddUnitToQueue(3);
}

function OnDashAbility()
{
   Game.player.ClearAllSelections();
   DestroyInfoPanelChildren();
   SwitchControlSet(0);

   NewAbilityCursor(2);
   colorPalette.gameObject.SetActive(true);
   SetInfoBackground(1);
}

function OnSlowAbility()
{
   Game.player.ClearAllSelections();
   DestroyInfoPanelChildren();
   SwitchControlSet(0);

   NewAbilityCursor(4);
   colorPalette.gameObject.SetActive(true);
   SetInfoBackground(1);
}

function OnPaintAbility()
{
   Game.player.ClearAllSelections();
   DestroyInfoPanelChildren();
   SwitchControlSet(0);

   NewAbilityCursor(1);
   colorPalette.gameObject.SetActive(true);
   SetInfoBackground(1);
}

function OnStunAbility()
{
   Game.player.ClearAllSelections();
   DestroyInfoPanelChildren();
   SwitchControlSet(0);

   NewAbilityCursor(3);
   colorPalette.gameObject.SetActive(true);
   SetInfoBackground(1);
}

private function SetColor(color : Color)
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      emitter.SetColor(color);
      UpdateEmitterInfo();
   }
   else if (abilityCursor)
   {
      abilityCursor.SetColor(color);
      lastSelectedAbilityColor = color;
   }
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

function OnDecreaseGameSpeed()
{
   Game.control.SpeedChange(false);
}

function OnIncreaseGameSpeed()
{
   Game.control.SpeedChange(true);
}

function OnResetGameSpeed()
{
   Game.control.SpeedReset(true);
}

function OnTooltipTrigger(data : TooltipTriggerData)
{
   // Hide
   if (!data.enterHover)
   {
      if (data.usePanelTooltip)
      {
         if (abilityCursor)
            UIControl.PanelTooltip(abilityCursor.tooltip+"\\n\\nCost: [00FF00]"+Game.costs.Ability(abilityCursor.ID));
         else
            UIControl.PanelTooltip("");
      }
      else
         UIControl.HoverTooltip("", data.offset);
   }
   else // Make visible
   {
      var tooltipString : String;
      tooltipString = data.text;
      var emitter : Emitter = null;
      if (Game.player.selectedStructure)
         emitter = Game.player.selectedStructure.GetComponent(Emitter);
      // Some tooltips require some dynamic data, add that here.
      switch (data.id)
      {
         case WidgetIDEnum.BUTTON_UNIT_POINT:
            if (emitter)
               tooltipString = tooltipString+"\\nCost: [00FF00]"+Game.costs.Unit(0, emitter.strength);
         break;
         case WidgetIDEnum.BUTTON_UNIT_HEALER:
            if (emitter)
               tooltipString = tooltipString+"\\nCost: [00FF00]"+Game.costs.Unit(1, emitter.strength);
         break;
         case WidgetIDEnum.BUTTON_UNIT_SHIELD:
            if (emitter)
               tooltipString = tooltipString+"\\nCost: [00FF00]"+Game.costs.Unit(2, emitter.strength);
         break;
         case WidgetIDEnum.BUTTON_UNIT_STUNNER:
            if (emitter)
               tooltipString = tooltipString+"\\nCost: [00FF00]"+Game.costs.Unit(3, emitter.strength);
         case WidgetIDEnum.BUTTON_EMITTER_LAUNCH:
            if (emitter)
               tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+emitter.GetCost();
         break;
         case WidgetIDEnum.BUTTON_ABILITY_DASH:
            tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.Ability(2);
         break;
         case WidgetIDEnum.BUTTON_ABILITY_SLOW:
            tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.Ability(4);
         break;
         case WidgetIDEnum.BUTTON_ABILITY_PAINT:
            tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.Ability(1);
         break;
         case WidgetIDEnum.BUTTON_ABILITY_STUN:
            tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.Ability(3);
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