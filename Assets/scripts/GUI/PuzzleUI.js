#pragma strict
#pragma downcast

static var uiIndex : int = 0;

var controlAreaSets : Transform[];
var colorPalette : Transform;
var speedControls : Transform;
var unitsPar : UILabel;
var timePar : UILabel;
var unitsUsedMax : UILabel;
var time : UILabel;
var abilityButtonParent : Transform;
var emitterWidgetStart : Transform;
var emitterWidgetPrefab : Transform;
var endGoalWidgetStart : Transform;
var endGoalWidgetPrefab : Transform;
var abilityButtonEffects : Transform[];

private var isDragging : boolean;
private var cameraControl : CameraControl2;
private var abilityCursor : AbilityBase;
private var controlSet : int;
private var lastSelectedAbilityColor : Color = Game.defaultColor;
private var lastSelectedAbility : int = -1;
private var hoverUnit : Unit;
private var setNewControlSet : boolean;
private var endGoalWidgets : List.<EndGoalWidget>;
private var deferredStructureSelection : Structure;
private var currentAbility : Transform;
private var processedMouseEvent : boolean;

function Awake()
{
   endGoalWidgets = List.<EndGoalWidget>();
}

function Start()
{
   speedControls.gameObject.SetActive(!Network.isClient);
}

function OnGUI()
{
   var e : Event = Event.current;

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.Space:
         if (cameraControl.isZoomedOut)
            cameraControl.SnapToFocusMouseLocation();
         else
            cameraControl.SnapToTopDownView();
         break;

      case KeyCode.R:
         cameraControl.SnapToDefaultView(true);
         break;

      case KeyCode.F:
         if (hoverUnit)
            cameraControl.Track(hoverUnit.transform);
         else
            cameraControl.SnapToFocusMouseLocation();
         break;

      case KeyCode.Escape:
         UIControl.SwitchUI(2); // in game menu
         break;
      }
   }
}

function OnSwitchFrom()
{
   DestroyAbilityCursor();
   Game.player.ClearAllSelections();
   UIControl.PanelTooltip("");
}

function OnSwitchTo()
{
   Game.player.ClearAllSelections();
   DestroyAbilityCursor();
   cameraControl = Camera.main.GetComponent(CameraControl2);
   UICamera.fallThrough = gameObject;
   SwitchControlSet(0);
   isDragging = false;
}

function SwitchControlSet(newSet : int)
{
   // We don't make immediately active here because we get
   // weird click through when selecting paint pot. Set in LateUpdate.
   controlSet = newSet;
   setNewControlSet = true;
}

function Update()
{
   // Units used versus max
   unitsUsedMax.text = Game.control.numUnitsUsed.ToString() + " / " + Game.map.unitMax.ToString();

   var str : String;
   if (Game.control.numUnitsUsed < Game.map.unitPar)
      str = "[00FF00]";
   else if (Game.control.numUnitsUsed == Game.map.unitPar)
      str = "[FFFF00]";
   else
      str = "[FF0000]";
   str += Game.map.unitPar.ToString() + " (" + (Game.control.numUnitsUsed - Game.map.unitPar).ToString() + ")";
   unitsPar.text = str;

   // Time
   var minutes : float = Mathf.Floor(Game.control.levelTime/60.0);
   var seconds : float = Mathf.Floor(Game.control.levelTime%60.0);
   str = minutes.ToString("#0")+":"+seconds.ToString("#00");
   time.text = minutes.ToString("#0")+":"+seconds.ToString("#00");

   // Time Par
   if (Game.control.levelTime < Game.map.timeBonusLimit)
      str = "[00FF00]";
   else
      str = "[FF0000]";
   minutes = Mathf.Floor(Game.map.timeBonusLimit/60.0);
   seconds = Mathf.Floor(Game.map.timeBonusLimit%60.0);
   str += "(" + minutes.ToString("#0")+":"+seconds.ToString("#00") + ")";
   timePar.text = str;
}

function LateUpdate()
{
   if (setNewControlSet)
   {
      for (var i : int=0; i<controlAreaSets.length; i++)
         controlAreaSets[i].gameObject.SetActive(i == controlSet);
      setNewControlSet = false;
   }

   if (deferredStructureSelection)
   {
      Game.player.SelectStructure(deferredStructureSelection);
      //Debug.Log("deferredStructureSelection");
      deferredStructureSelection = null;
   }


   //   cameraControl.SnapToFocusLocation(emitter.transform.position, true);
   //else
}

function OnPress(isPressed : boolean)
{
   // LMB
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (Game.player.selectedStructure && processedMouseEvent == false)
         {
            //Debug.Log("OnPress: "+Game.player.selectedStructure);
            if (Game.player.selectedStructure)
            {
               if ( Game.player.selectedStructure.canBeAimed)
                  Game.player.selectedStructure.OnPress(isPressed);
               else
               {
                  Game.player.ClearAllSelections();
                  SwitchControlSet(0);
               }
            }
         }
      break;

      // LMB
      case -2:
         if (isPressed && Game.player.selectedStructure && Game.player.selectedStructure.isAiming)
         {
            Game.player.selectedStructure.CancelAim();
         }
      break;
   }
}

function OnDrag(delta : Vector2)
{
   isDragging = true;

   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         cameraControl.Pan(delta);
      break;
      // RMB
      case -2:
         cameraControl.Rotate(delta);
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
      else if (Game.player.selectedStructure)
      {
      }
      else if (currentAbility)
      {
         Instantiate(currentAbility, Game.control.GetMouseWorldPosition(), Quaternion.identity);
      }
      processedMouseEvent = false;
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
            //DestroyAbilityCursor();
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
   }
   isDragging = false;
}

function OnDoubleClick()
{
   //LMB
   if (abilityCursor==null && UICamera.currentTouchID == -1)
   {
      //if (hoverUnit)
         //cameraControl.Track(hoverUnit.transform);
   }
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
}

function OnMouseEnterUnit(unit : Unit)
{
   //if (abilityCursor==null)
   //{
      hoverUnit = unit;
      unit.SetHovered(true);
      unit.SetHudVisible(true);
      UIControl.PanelTooltip(unit.GetToolTipString());
   //}
}

function OnMouseExitUnit(unit : Unit)
{
   //if (abilityCursor==null)
   //{
      if (hoverUnit == unit)
         hoverUnit = null;
      unit.SetHovered(false);
      unit.SetHudVisible(false);
      UIControl.PanelTooltip("");
   //}
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
   //if (abilityCursor==null)
      //emitter.SetHovered(true);
}

function OnMouseExitEmitter(emitter : Emitter)
{
   //if (abilityCursor==null)
      //emitter.SetHovered(false);
}

function OnPressEmitterWidget(emitter : Emitter)
{
   //Debug.Log("PuzzleUI:OnPressEmitterWidget");
   cameraControl.SnapToFocusLocation(emitter.transform.position, false);
   OnPressEmitter(emitter);
}

function OnPressEndGoalWidget(goal : GoalStation)
{
   //Debug.Log("PuzzleUI:OnPressEndGoalWidget");
   cameraControl.SnapToFocusLocation(goal.transform.position, false);
}

function OnUnitReachedGoal(goal : GoalStation)
{
   Debug.Log("PuzzleUI:OnUnitReachedGoal: index="+goal.assignedIndex);
   for (var goalWidget : EndGoalWidget in endGoalWidgets)
   {
      if (goalWidget.goal == goal)
         goalWidget.UnitReachedGoal();
   }
}

function OnCreateWidgets()
{
	CreateEmitterIcons();
	CreateEndGoalIcons();
}

function CreateEmitterIcons()
{
   var xStride : float = 30;
   var count : float = 0;
   for (var emitter : Emitter in Game.control.emitters)
   {
      var newWidget : GameObject = NGUITools.AddChild(emitterWidgetStart.gameObject, emitterWidgetPrefab.gameObject);
      newWidget.transform.localPosition.x += (xStride * count);
      newWidget.transform.localScale = Vector3(0.077, 0.25, 0.25);
      count += 1;

      Debug.Log("PuzzleUI:CreateEmitterIcons");

      var newEmitterButton : EmitterWidget = newWidget.GetComponent(EmitterWidget);
      newEmitterButton.emitter = emitter;
   }
}

function CreateEndGoalIcons()
{
   var yStride : float = -30;
   var count : float = 0;
   for (var goal : GoalStation in Game.control.goals)
   {
      var newWidget : GameObject = NGUITools.AddChild(endGoalWidgetStart.gameObject, endGoalWidgetPrefab.gameObject);
      newWidget.transform.localPosition.y += (yStride * count);
      count += 1;

      Debug.Log("PuzzleUI:CreateEndGoalIcons: index="+goal.assignedIndex);

      var newGoalWidget : EndGoalWidget = newWidget.GetComponent(EndGoalWidget);
      newGoalWidget.goal = goal;
      if (newGoalWidget)
      {
      	endGoalWidgets.Add(newGoalWidget);
		   for (var c : Color in goal.requiredColors)
   			newGoalWidget.AddUnitIcon(c);
      }
   }
}

function NewAbilityCursor(type : int)
{
   if (lastSelectedAbility != type)
   {
      DestroyAbilityCursor(false);

      var cursorObject : GameObject = Instantiate(Game.prefab.Ability(type), Vector3.zero, Quaternion.identity);
      cursorObject.name = "AttackAbilityCursor";
      cursorObject.tag = "";
      cursorObject.SendMessage("MakeCursor", true);
      cursorObject.collider.enabled = false;
      abilityCursor = cursorObject.GetComponent(AbilityBase);
      abilityCursor.SetColor(lastSelectedAbilityColor);
      lastSelectedAbility = type;
   }
   else
   {
      DestroyAbilityCursor(false);
   }
}

function DestroyAbilityCursor(untoggleButtons : boolean)
{
   currentAbility = null;

   if (abilityCursor)
   {
      for (var child : Transform in abilityCursor.transform)
         Destroy(child.gameObject);
      Destroy(abilityCursor.gameObject);

      // Untoggle any ability buttons
      if (untoggleButtons)
      {
         var buttons : Component[];
         buttons = abilityButtonParent.GetComponentsInChildren (UICheckbox);
         for (var b : UICheckbox in buttons)
             b.isChecked = false;
      }
   }
   lastSelectedAbility = -1;
}

function DestroyAbilityCursor()
{
   DestroyAbilityCursor(true);
}

function OnClickUnit(unit : Unit)
{
}

function OnPressRedirector(controller : RedirectorController)
{
   //DestroyAbilityCursor(true);
   controller.Redirect();
}

function OnPressEmitter(emitter : Emitter)
{
   //var selectedEmitter : Emitter = Game.player.selectedEmitter;
   //if (selectedEmitter && emitter == selectedEmitter)
   //   cameraControl.SnapToFocusLocation(emitter.transform.position, true);
   //else
   Game.player.SelectStructure(emitter);
   //DestroyAbilityCursor();
   SwitchControlSet(1);
   processedMouseEvent = true;
}

function OnClickStructure(structure : Structure)
{
   Debug.Log("OnClickStructure");
   Game.player.ClearSelectedStructure();
   deferredStructureSelection = structure;
   SwitchControlSet(0);
   processedMouseEvent = true;
}

function OnLaunch()
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      // Clear and readd one point unit, and launch.
      // Probably can just do this once at emitter Start().
      emitter.ClearQueue();
      AddUnitToQueue(0);
      emitter.Launch();
   }
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
}


function OnButton1()
{
   Game.player.ClearAllSelections();
   SwitchControlSet(0);
   currentAbility = abilityButtonEffects[0];
}

function OnButton2()
{
   Game.player.ClearAllSelections();
   SwitchControlSet(0);
   currentAbility = abilityButtonEffects[1];
}

function OnButton3()
{
   Game.player.ClearAllSelections();
   SwitchControlSet(0);
   currentAbility = abilityButtonEffects[2];
}

private function SetColor(color : Color)
{
   if (processedMouseEvent)
      return;

   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      emitter.SetColor(color);
      OnLaunch();
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
   //SetColor(Color.yellow);
   SetColor(Color(1.0, 1.0, 0.0, 1.0));
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
   Game.control.SpeedChange(Time.timeScale * 0.5);
}

function OnIncreaseGameSpeed()
{
   Game.control.SpeedChange(Time.timeScale * 2.0);
}

function OnResetGameSpeed()
{
   Game.control.SpeedChange(1.0);
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