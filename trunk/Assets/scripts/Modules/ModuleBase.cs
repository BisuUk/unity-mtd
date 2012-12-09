using System;
using System.Collections;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// Module base is the base class for all modules in the Nuaj' atmospheric system
	/// </summary>
	[Serializable]
	public abstract class ModuleBase : IMonoBehaviour
	{
		#region FIELDS

		protected NuajManager		m_Owner = null;

		/////////////////////////////////////////////////////////
		// General serializable parameters
		[SerializeField] protected string			m_Name = "";
		[SerializeField] protected bool				m_bEnabled = true;
		[SerializeField] protected float			m_Quality = 1.0f;

		//////////////////////////////////////////////////////////////////////////
		// Internal data
		protected int				m_ScreenWidth = 0;
		protected int				m_ScreenHeight = 0;

		// Error state
		protected bool				m_bInErrorState = false;
		protected string			m_Error = "";
		protected bool				m_bInWarningState = false;
		protected string			m_Warning = "";

		#endregion

		#region PROPERTIES

		/// <summary>
		/// Gets the Owner NuajManager instance
		/// </summary>
		public virtual NuajManager	Owner	{ get { return m_Owner; } internal set { m_Owner = value; } }
		
		/// <summary>
		/// Gets the name of the module
		/// </summary>
		public string				Name	{ get { return m_Name; } }

		/// <summary>
		/// Gets or sets the enabled state of that module.
		/// A disabled module will not render
		/// </summary>
		public virtual bool			Enabled
		{
			get { return m_bEnabled && !m_bInErrorState; }
			set
			{
				if ( value == m_bEnabled )
					return;

				m_bEnabled = value;

				// Notify
				if ( EnabledChanged != null )
					EnabledChanged( this, EventArgs.Empty );
			}
		}

		/// <summary>
		/// Gets or sets the overall quality of the module rendering
		/// It's up to the module to adjust its internal parameters to match the provided quality
		/// </summary>
		[Obsolete( "Maybe that property will be used again someday but it's disabled for the moment." )]
		public virtual float		Quality
		{
			get { return m_Quality; }
			set
			{
				if ( value == m_Quality )
					return;

				m_Quality = value;

				// Notify
				if ( QualityChanged != null )
					QualityChanged( this, EventArgs.Empty );
			}
		}

		/// <summary>
		/// Tells if the module is in an error state
		/// </summary>
		public bool					IsInErrorState		{ get { return m_bInErrorState || (m_Owner != null && m_Owner.IsInErrorState); } }

		/// <summary>
		/// Gives informations about the error state
		/// </summary>
		public string				Error				{ get { return m_bInErrorState ? m_Error : (m_Owner != null ? m_Owner.Error : ""); } }

		/// <summary>
		/// Tells if the module is in an warning state
		/// </summary>
		public bool					IsInWarningState	{ get { return m_bInWarningState || (m_Owner != null && m_Owner.IsInWarningState); } }

		/// <summary>
		/// Gives informations about the warning state
		/// </summary>
		public string				Warning				{ get { return m_bInWarningState ? m_Warning : (m_Owner != null ? m_Owner.Warning : ""); } }

		/// <summary>
		/// Occurs when the Enabled state changes
		/// </summary>
		public event EventHandler	EnabledChanged;
		/// <summary>
		/// Occurs when the Quality state changes
		/// </summary>
		public event EventHandler	QualityChanged;
		/// <summary>
		/// Occurs when the Error state changes
		/// </summary>
		public event EventHandler	ErrorStateChanged;

		#endregion

		#region METHODS

		internal	ModuleBase( string _Name )
		{
			m_Name = _Name;
		}

		#region IMonoBehaviour Members

		public abstract void	OnDestroy();

		public abstract void	Awake();

		public abstract void	Start();

		public abstract void	OnEnable();

		public abstract void	OnDisable();

		public abstract void	Update();

		#endregion

		#region Render Targets Size Update

		/// <summary>
		/// Destroys then re-creates render targets for this module
		/// </summary>
		public void				UpdateRenderTargets()
		{
			DestroyRenderTargets();
			CreateRenderTargets( m_ScreenWidth, m_ScreenHeight );
		}

		/// <summary>
		/// Notifies the module to destroy its render targets
		/// </summary>
		public void				DestroyRenderTargets()
		{
			InternalDestroyRenderTargets();
		}

		/// <summary>
		/// Notifies the module to create its render targets
		/// </summary>
		/// <param name="_ScreenWidth"></param>
		/// <param name="_ScreenHeight"></param>
		public void				CreateRenderTargets( int _ScreenWidth, int _ScreenHeight )
		{
			m_ScreenWidth = _ScreenWidth;
			m_ScreenHeight = _ScreenHeight;
			InternalCreateRenderTargets();
		}

		protected abstract void	InternalDestroyRenderTargets();
		protected abstract void	InternalCreateRenderTargets();

		#endregion

		#region Helpers

		/// <summary>
		/// Called by the manager whenever the upscale technique changed
		/// </summary>
		internal virtual void		UpScaleTechniqueChanged( NuajManager.UPSCALE_TECHNIQUE _Technique )
		{
		}

		/// <summary>
		/// Enters error mode. The module is then disabled and can't render anymore
		/// </summary>
		/// <param name="_Error"></param>
		protected void			EnterErrorState( string _Error )
		{
			m_bInErrorState = true;
			m_Error = _Error;

			Nuaj.Help.LogWarning( "Module \"" + Name + "\" entered error state with :\r\n" + _Error );

			// Notify
			if ( ErrorStateChanged != null )
				ErrorStateChanged( this, EventArgs.Empty );
		}

		/// <summary>
		/// Exits error mode. The module is then enabled again
		/// </summary>
		protected void			ExitErrorState()
		{
			m_bInErrorState = false;

			// Notify
			if ( ErrorStateChanged != null )
				ErrorStateChanged( this, EventArgs.Empty );
		}

		#endregion

		#endregion
	}
}