#pragma strict
#pragma downcast

static var uiIndex : int = 0;

var controlAreaSets : Transform[];
var colorPalette : Transform;
var speedControls : Transform;
var scoreText : UILabel;
var timeText : UILabel;
var abilityButtonParent : Transform;
var endGoalWidgetStart : Transform;
var endGoalWidgetPrefab : Transform;

private var isDragging : boolean;
private var cameraControl : CameraControl2;
private var abilityCursor : AbilityBase;
private var controlSet : int;
private var lastSelectedAbilityColor : Color = Game.defaultColor;
private var lastSelectedAbility : int = -1;
private var hoverUnit : Unit;
private var setNewControlSet : boolean;
private var endGoalWidgets : List.<EndGoalWidget>;

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

      case KeyCode.R:
         if (!e.shift)
            cameraControl.SnapToTopDownView();
         else
            cameraControl.SnapToDefaultView(Game.player.isAttacker);
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

function Update()
{
   // Title bar
   scoreText.text = Game.control.score.ToString();

   var minutes : float = Mathf.Floor(Game.control.levelTime/60.0);
   var seconds : float = Mathf.Floor(Game.control.levelTime%60.0);
   timeText.text = minutes.ToString("#0")+":"+seconds.ToString("#00");
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

function LateUpdate()
{
   if (setNewControlSet)
   {
      for (var i : int=0; i<controlAreaSets.length; i++)
         controlAreaSets[i].gameObject.SetActive(i == controlSet);
      setNewControlSet = false;
   }
}

function OnPress(isPressed : boolean)
{
   // LMB
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
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
   }
   isDragging = false;
}

function OnDoubleClick()
{
   //LMB
   if (abilityCursor==null && UICamera.currentTouchID == -1)
   {
      if (hoverUnit)
         cameraControl.Track(hoverUnit.transform);
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

function OnUnitReachedGoal(goal : GoalStation)
{
   Debug.Log("PuzzleUI:OnUnitReachedGoal: index="+goal.assignedIndex);
   for (var goalWidget : EndGoalWidget in endGoalWidgets)
   {
      if (goalWidget.goal == goal)
      {
         goalWidget.UnitReachedGoal();
      }
   }
}

function OnSetGoalIcons()
{
   var yStride : float = -30;
   var count : float = 0;
   for (var goal : GoalStation in Game.control.goals)
   {
      var newWidget : GameObject = NGUITools.AddChild(endGoalWidgetStart.gameObject, endGoalWidgetPrefab.gameObject);
      //var newWidget : GameObject = Instantiate(endGoalWidgetPrefab.gameObject, endGoalWidgetStart.transform.position, Quaternion.identity);
      //newWidget.transform.parent = endGoalWidgetStart;
      //newWidget.transform.localScale = Vector3.one;
      //newWidget.transform.localPosition.x += 10;
      newWidget.transform.localPosition.y += (yStride * count);
      count += 1;

      Debug.Log("PuzzleUI:OnSetGoalIcons: index="+goal.assignedIndex);

      var newGoalWidget : EndGoalWidget = newWidget.GetComponent(EndGoalWidget);
      newGoalWidget.goal = goal;
      if (newGoalWidget)
      {
      	endGoalWidgets.Add(newGoalWidget);
		   for (var c : Color in goal.requiredColors)
   		{
   			newGoalWidget.AddUnitIcon(c);
   		}
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

function OnClickRedirector(controller : RedirectorController)
{
   DestroyAbilityCursor(true);
   controller.Redirect();
}

function OnSelectEmitter(emitter : Emitter)
{
   //var selectedEmitter : Emitter = Game.player.selectedEmitter;
   //if (selectedEmitter && emitter == selectedEmitter)
   //   cameraControl.SnapToFocusLocation(emitter.transform.position, true);
   //else
      Game.player.SelectEmitter(emitter);

   DestroyAbilityCursor();
   SwitchControlSet(1);
}

function OnLaunch()
{
   var emitter : Emitter = Game.player.selectedEmitter;
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
   var emitter : Emitter = Game.player.selectedEmitter;
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


function OnDashAbility()
{
   Game.player.ClearAllSelections();
   SwitchControlSet(0);

   NewAbilityCursor(2);
}

function OnSlowAbility()
{
   Game.player.ClearAllSelections();
   SwitchControlSet(0);

   NewAbilityCursor(4);
}

function OnPaintAbility()
{
   Game.player.ClearAllSelections();
   SwitchControlSet(0);

   NewAbilityCursor(1);
}

private function SetColor(color : Color)
{
   var emitter : Emitter = Game.player.selectedEmitter;
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
      var emitter : Emitter = Game.player.selectedEmitter;
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